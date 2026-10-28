// GENERATO da scripts/vendor.mjs — non modificare: modifica packages/ e rilancia `npm run vendor`.
/**
 * VaultSession: stato "sbloccato" di un client.
 *
 * - carica i vault (`GET /vaults`) e apre ogni `encryptedVaultKey` con la
 *   privateKey dell'utente;
 * - scarica e decifra gli item di ogni vault (gli item non decifrabili vengono
 *   saltati e segnalati, mai fatti esplodere);
 * - ricerca per titolo / username / URL e match per dominio (eTLD+1);
 * - crea e aggiorna item ricifrando con la vaultKey (optimistic locking su `version`);
 * - esporta/importa uno snapshot serializzabile (chiavi in base64url + blob
 *   cifrati) per storage effimeri come `chrome.storage.session` o la Cache di
 *   Raycast. Lo snapshot NON contiene mai plaintext degli item.
 */
import {
  BULK_ITEMS_MAX,
  ItemData,
  createVaultKey,
  decryptItem,
  encryptItem,
  fromB64,
  memzero,
  toB64,
  unsealVaultKey,
  type Item,
  type UnlockedKeys,
  type Vault,
} from "../shared/index.js";
import { ApiClient } from "./api.js";
import { ApiError, ConflictError } from "./errors.js";
import { matchUrl, urlMatchKey } from "./url.js";
import type { ImportPlan } from "./import/plan.js";

/** Avanzamento di un import: `done` item caricati su `total`. */
export interface ImportProgress {
  done: number;
  total: number;
  vaultName: string;
}

export interface ImportReport {
  created: number;
  vaultsCreated: string[];
}

/** Dimensione massima (caratteri dei blob) di una singola richiesta bulk: resta sotto il limite di 8 MiB del server. */
const BULK_MAX_CHARS = 6 * 1024 * 1024;
const BULK_CHUNK = Math.min(200, BULK_ITEMS_MAX);

export interface DecryptedItem {
  id: string;
  vaultId: string;
  vaultName: string;
  version: number;
  updatedAt: string;
  data: ItemData;
}

export interface VaultEntry {
  vault: Vault;
  vaultKey: Uint8Array;
}

export interface LoadReport {
  vaults: number;
  items: number;
  /** id degli item che non è stato possibile decifrare */
  undecryptable: string[];
  /** vault la cui chiave non è stato possibile aprire */
  unopenableVaults: string[];
}

/** Forma serializzabile delle chiavi utente (base64url). */
export interface SerializedKeys {
  userKey: string;
  publicKey: string;
  privateKey: string;
}

/** Snapshot serializzabile dell'intera sessione: solo chiavi (b64) e blob cifrati. */
export interface SessionSnapshot {
  v: 1;
  keys: SerializedKeys;
  vaults: Array<{ vault: Vault; vaultKey: string }>;
  items: Item[];
  loadedAt: string;
}

export function serializeKeys(keys: UnlockedKeys): SerializedKeys {
  return { userKey: toB64(keys.userKey), publicKey: toB64(keys.publicKey), privateKey: toB64(keys.privateKey) };
}

export function deserializeKeys(s: SerializedKeys): UnlockedKeys {
  return { userKey: fromB64(s.userKey), publicKey: fromB64(s.publicKey), privateKey: fromB64(s.privateKey) };
}

function normalizeQuery(q: string): string {
  return q.normalize("NFKC").toLowerCase().trim();
}

/**
 * Punteggio di ricerca "fuzzy leggera": match esatto di prefisso > sottostringa
 * > sottosequenza di caratteri. 0 = nessun match.
 */
export function scoreMatch(haystack: string, needle: string): number {
  const h = normalizeQuery(haystack);
  const n = normalizeQuery(needle);
  if (!n) return 1;
  if (!h) return 0;
  if (h === n) return 100;
  if (h.startsWith(n)) return 80;
  const idx = h.indexOf(n);
  if (idx >= 0) return 60 - Math.min(idx, 20);
  // sottosequenza: ogni carattere della query appare in ordine
  let hi = 0;
  for (const ch of n) {
    hi = h.indexOf(ch, hi);
    if (hi < 0) return 0;
    hi++;
  }
  return 10;
}

/**
 * Qualità di un match per sottostringa: esatto (4) > prefisso (3) >
 * inizio di parola (2) > sottostringa (1). 0 = nessun match.
 */
function substringQuality(haystack: string, needle: string): { quality: number; index: number } {
  const h = normalizeQuery(haystack);
  if (!h || !needle) return { quality: 0, index: -1 };
  if (h === needle) return { quality: 4, index: 0 };
  if (h.startsWith(needle)) return { quality: 3, index: 0 };
  const first = h.indexOf(needle);
  if (first < 0) return { quality: 0, index: -1 };
  for (let i = first; i >= 0; i = h.indexOf(needle, i + 1)) {
    if (!/[\p{L}\p{N}]/u.test(h[i - 1] ?? "")) return { quality: 2, index: i };
  }
  return { quality: 1, index: first };
}

function isSubsequence(haystack: string, needle: string): boolean {
  const h = normalizeQuery(haystack);
  let hi = 0;
  for (const ch of needle) {
    hi = h.indexOf(ch, hi);
    if (hi < 0) return false;
    hi++;
  }
  return h.length > 0;
}

/**
 * Punteggio di ricerca di un item a livelli: un match sul titolo batte sempre
 * un match su username, che batte URL, note, campi personalizzati e vault.
 * Dentro lo stesso campo: esatto > prefisso > inizio parola > sottostringa
 * (prima compare, meglio è). I match "fuzzy" (sottosequenza di caratteri) su
 * titolo/username/URL vengono dopo tutti i match per sottostringa.
 * `query` deve essere già normalizzata. 0 = nessun match.
 */
export function searchScore(item: DecryptedItem, query: string): number {
  const d = item.data;
  const groups: string[][] = [
    [d.title],
    [d.username],
    d.urls,
    [d.notes],
    d.fields.flatMap((f) => (f.hidden ? [f.name] : [f.name, f.value])),
    [item.vaultName],
  ];
  for (let rank = 0; rank < groups.length; rank++) {
    let best = 0;
    for (const text of groups[rank]!) {
      const m = substringQuality(text, query);
      if (m.quality > 0) best = Math.max(best, m.quality * 100 - Math.min(m.index, 99));
    }
    if (best > 0) return 10_000 - rank * 1_000 + best;
  }
  for (let rank = 0; rank < 3; rank++) {
    if (groups[rank]!.some((text) => isSubsequence(text, query))) return 1_000 - rank * 100;
  }
  return 0;
}

export class VaultSession {
  readonly api: ApiClient;
  readonly keys: UnlockedKeys;
  private vaults = new Map<string, VaultEntry>();
  private items = new Map<string, DecryptedItem>();
  private rawItems = new Map<string, Item>();
  private loadedAt: string | null = null;
  private locked = false;

  constructor(api: ApiClient, keys: UnlockedKeys) {
    this.api = api;
    this.keys = keys;
  }

  // ---------- caricamento ----------

  /** Scarica vault e item, apre le chiavi e decifra tutto in memoria. */
  async load(): Promise<LoadReport> {
    this.assertUnlocked();
    const vaults = await this.api.listVaults();
    const report: LoadReport = { vaults: 0, items: 0, undecryptable: [], unopenableVaults: [] };

    const nextVaults = new Map<string, VaultEntry>();
    for (const vault of vaults) {
      try {
        nextVaults.set(vault.id, { vault, vaultKey: unsealVaultKey(vault.encryptedVaultKey, this.keys) });
        report.vaults++;
      } catch {
        report.unopenableVaults.push(vault.id);
      }
    }

    const nextItems = new Map<string, DecryptedItem>();
    const nextRaw = new Map<string, Item>();
    for (const entry of nextVaults.values()) {
      const items = await this.api.listItems(entry.vault.id);
      for (const item of items) {
        if (item.deletedAt) continue;
        const dec = this.decrypt(item, entry);
        if (dec) {
          nextItems.set(item.id, dec);
          nextRaw.set(item.id, item);
          report.items++;
        } else {
          report.undecryptable.push(item.id);
        }
      }
    }

    // sostituzione atomica + azzeramento delle vecchie chiavi non più presenti
    for (const [id, old] of this.vaults) if (!nextVaults.has(id)) memzero(old.vaultKey);
    this.vaults = nextVaults;
    this.items = nextItems;
    this.rawItems = nextRaw;
    this.loadedAt = new Date().toISOString();
    return report;
  }

  private decrypt(item: Item, entry: VaultEntry): DecryptedItem | null {
    try {
      return {
        id: item.id,
        vaultId: item.vaultId,
        vaultName: entry.vault.name,
        version: item.version,
        updatedAt: item.updatedAt,
        data: decryptItem(item.data, entry.vaultKey),
      };
    } catch {
      return null;
    }
  }

  // ---------- accesso ----------

  get isLoaded(): boolean {
    return this.loadedAt !== null;
  }
  get lastLoadedAt(): string | null {
    return this.loadedAt;
  }

  listVaults(): Vault[] {
    this.assertUnlocked();
    return [...this.vaults.values()].map((v) => v.vault);
  }

  /** Vault in cui l'utente può scrivere (owner o editor). */
  listWritableVaults(): Vault[] {
    return this.listVaults().filter((v) => v.role === "owner" || v.role === "editor");
  }

  getVaultKey(vaultId: string): Uint8Array {
    this.assertUnlocked();
    const entry = this.vaults.get(vaultId);
    if (!entry) throw new Error(`Vault ${vaultId} non disponibile`);
    return entry.vaultKey;
  }

  listItems(): DecryptedItem[] {
    this.assertUnlocked();
    return [...this.items.values()].sort((a, b) => a.data.title.localeCompare(b.data.title));
  }

  getItem(id: string): DecryptedItem | undefined {
    this.assertUnlocked();
    return this.items.get(id);
  }

  /**
   * Ricerca con priorità al nome dell'elemento: prima tutti i match sul titolo,
   * poi username, URL, note, campi personalizzati e nome del vault.
   * Vedi `searchScore`.
   */
  search(query: string, limit = 50): DecryptedItem[] {
    this.assertUnlocked();
    const q = normalizeQuery(query);
    if (!q) return this.listItems().slice(0, limit);
    const scored: Array<{ item: DecryptedItem; score: number }> = [];
    for (const item of this.items.values()) {
      const score = searchScore(item, q);
      if (score > 0) scored.push({ item, score });
    }
    scored.sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.item.data.favorite) - Number(a.item.data.favorite) ||
        a.item.data.title.localeCompare(b.item.data.title),
    );
    return scored.slice(0, limit).map((s) => s.item);
  }

  /** Item di tipo login i cui URL appartengono allo stesso eTLD+1 di `pageUrl`. */
  matchesForUrl(pageUrl: string): DecryptedItem[] {
    this.assertUnlocked();
    if (!urlMatchKey(pageUrl)) return [];
    return [...this.items.values()]
      .filter((it) => it.data.type === "login" && matchUrl(it.data.urls, pageUrl))
      .sort((a, b) => Number(b.data.favorite) - Number(a.data.favorite) || a.data.title.localeCompare(b.data.title));
  }

  // ---------- scrittura ----------

  async createItem(vaultId: string, data: ItemData): Promise<DecryptedItem> {
    this.assertUnlocked();
    const entry = this.vaults.get(vaultId);
    if (!entry) throw new Error(`Vault ${vaultId} non disponibile`);
    const parsed = ItemData.parse(data);
    const created = await this.api.createItem(vaultId, encryptItem(parsed, entry.vaultKey));
    const dec: DecryptedItem = {
      id: created.id,
      vaultId: created.vaultId,
      vaultName: entry.vault.name,
      version: created.version,
      updatedAt: created.updatedAt,
      data: parsed,
    };
    this.items.set(dec.id, dec);
    this.rawItems.set(created.id, created);
    return dec;
  }

  /** Crea un vault personale (o di organizzazione) con una nuova vaultKey sigillata per l'utente. */
  async createVault(name: string, organizationId?: string): Promise<Vault> {
    this.assertUnlocked();
    const { vaultKey, encryptedVaultKey } = createVaultKey(this.keys.publicKey);
    const vault = await this.api.createVault({ name, encryptedVaultKey, ...(organizationId ? { organizationId } : {}) });
    this.vaults.set(vault.id, { vault, vaultKey });
    return vault;
  }

  /**
   * Esegue un piano di import: crea i vault mancanti, cifra gli item con la
   * vaultKey e li carica a blocchi con l'endpoint bulk (ogni blocco è atomico).
   * In caso di errore a metà, i blocchi già caricati restano: il report
   * parziale è nell'errore (`ImportFailedError.report`).
   */
  async importPlan(plan: ImportPlan, onProgress?: (p: ImportProgress) => void): Promise<ImportReport> {
    this.assertUnlocked();
    const report: ImportReport = { created: 0, vaultsCreated: [] };
    try {
      for (const batch of plan.batches) {
        let entry: VaultEntry | undefined;
        if (batch.vaultId) {
          entry = this.vaults.get(batch.vaultId);
          if (!entry) throw new Error(`Vault ${batch.vaultId} non disponibile`);
          if (entry.vault.role === "reader") throw new Error(`Non hai i permessi di scrittura sul vault «${entry.vault.name}»`);
        } else {
          const vault = await this.createVault(batch.newVaultName ?? "Importati");
          report.vaultsCreated.push(vault.name);
          entry = this.vaults.get(vault.id)!;
        }
        const { vault, vaultKey } = entry;
        let chunk: Array<{ data: ItemData; blob: string }> = [];
        let chars = 0;
        const flush = async () => {
          if (!chunk.length) return;
          const res = await this.api.createItemsBulk(vault.id, chunk.map((c) => c.blob));
          res.items.forEach((created, i) => {
            this.rawItems.set(created.id, created);
            this.items.set(created.id, {
              id: created.id,
              vaultId: created.vaultId,
              vaultName: vault.name,
              version: created.version,
              updatedAt: created.updatedAt,
              data: chunk[i]!.data,
            });
          });
          report.created += res.items.length;
          onProgress?.({ done: report.created, total: plan.total, vaultName: vault.name });
          chunk = [];
          chars = 0;
        };
        for (const raw of batch.items) {
          const data = ItemData.parse(raw);
          const blob = encryptItem(data, vaultKey);
          if (chunk.length >= BULK_CHUNK || (chunk.length && chars + blob.length > BULK_MAX_CHARS)) await flush();
          chunk.push({ data, blob });
          chars += blob.length;
        }
        await flush();
      }
    } catch (err) {
      throw new ImportFailedError(report, err);
    }
    return report;
  }

  /**
   * Aggiorna un item ricifrandolo. Usa la `version` locale per l'optimistic
   * locking: se il server risponde 409 viene lanciato `ConflictError` e il
   * chiamante dovrebbe ricaricare (`load()`) e riprovare.
   * Se la password cambia, la precedente finisce in `passwordHistory`.
   */
  async updateItem(itemId: string, data: ItemData, expectedVersion?: number): Promise<DecryptedItem> {
    this.assertUnlocked();
    const current = this.items.get(itemId);
    if (!current) throw new Error(`Item ${itemId} non trovato`);
    const entry = this.vaults.get(current.vaultId);
    if (!entry) throw new Error(`Vault ${current.vaultId} non disponibile`);

    const next = ItemData.parse(data);
    if (current.data.password && next.password !== current.data.password) {
      next.passwordHistory = [
        { password: current.data.password, changedAt: new Date().toISOString() },
        ...next.passwordHistory,
      ].slice(0, 20);
    }
    const version = expectedVersion ?? current.version;
    let updated: Item;
    try {
      updated = await this.api.updateItem(itemId, encryptItem(next, entry.vaultKey), version);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) throw new ConflictError(itemId);
      throw err;
    }
    const dec: DecryptedItem = { ...current, version: updated.version, updatedAt: updated.updatedAt, data: next };
    this.items.set(itemId, dec);
    this.rawItems.set(itemId, updated);
    return dec;
  }

  async deleteItem(itemId: string): Promise<void> {
    this.assertUnlocked();
    await this.api.deleteItem(itemId);
    this.items.delete(itemId);
    this.rawItems.delete(itemId);
  }

  // ---------- snapshot ----------

  /** Snapshot serializzabile: chiavi in base64url + item ancora cifrati. */
  exportSnapshot(): SessionSnapshot {
    this.assertUnlocked();
    return {
      v: 1,
      keys: serializeKeys(this.keys),
      vaults: [...this.vaults.values()].map((e) => ({ vault: e.vault, vaultKey: toB64(e.vaultKey) })),
      items: [...this.rawItems.values()],
      loadedAt: this.loadedAt ?? new Date().toISOString(),
    };
  }

  /** Ricostruisce la sessione da uno snapshot decifrando gli item in memoria. */
  static fromSnapshot(api: ApiClient, snapshot: SessionSnapshot): VaultSession {
    const session = new VaultSession(api, deserializeKeys(snapshot.keys));
    for (const v of snapshot.vaults) {
      session.vaults.set(v.vault.id, { vault: v.vault, vaultKey: fromB64(v.vaultKey) });
    }
    for (const item of snapshot.items) {
      const entry = session.vaults.get(item.vaultId);
      if (!entry || item.deletedAt) continue;
      const dec = session.decrypt(item, entry);
      if (dec) {
        session.items.set(item.id, dec);
        session.rawItems.set(item.id, item);
      }
    }
    session.loadedAt = snapshot.loadedAt;
    return session;
  }

  // ---------- lock ----------

  /** Azzera tutte le chiavi e svuota la memoria. Dopo `lock()` l'istanza è inutilizzabile. */
  lock(): void {
    if (this.locked) return;
    this.locked = true;
    for (const entry of this.vaults.values()) memzero(entry.vaultKey);
    memzero(this.keys.userKey);
    memzero(this.keys.privateKey);
    this.vaults.clear();
    this.items.clear();
    this.rawItems.clear();
  }

  get isLocked(): boolean {
    return this.locked;
  }

  private assertUnlocked(): void {
    if (this.locked) throw new Error("Sessione bloccata");
  }
}

/** Errore durante il caricamento di un import: contiene quanto già caricato. */
export class ImportFailedError extends Error {
  constructor(
    readonly report: ImportReport,
    cause: unknown,
  ) {
    super(`Import interrotto dopo ${report.created} elementi: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
    this.name = "ImportFailedError";
  }
}

/** Crea un `ItemData` di tipo login con i default dello schema. */
export function newLoginItem(partial: Partial<ItemData> & { title: string }): ItemData {
  return ItemData.parse({ v: 1, type: "login", ...partial });
}
