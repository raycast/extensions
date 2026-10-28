// GENERATO da scripts/vendor.mjs — non modificare: modifica packages/ e rilancia `npm run vendor`.
/**
 * Pianificazione dell'import: destinazione (un vault o un vault per cartella) e
 * rilevamento dei duplicati, prima di cifrare e caricare.
 */
import type { ItemData, Vault } from "../../shared/index.js";
import { hostOf } from "./normalize.js";
import type { ImportedItem } from "./types.js";

export type FolderStrategy = "single" | "per-folder";

export interface ImportPlanOptions {
  /** Vault di destinazione (per tutti gli item, o per quelli senza cartella). */
  targetVaultId: string;
  /** "single": tutto nel vault scelto; "per-folder": un vault per ogni cartella di origine. */
  folders: FolderStrategy;
  /** Salta gli elementi uguali a uno già presente nel vault di destinazione o già visto nel file. */
  skipDuplicates: boolean;
}

export interface ImportBatch {
  /** Vault esistente di destinazione, oppure... */
  vaultId: string | null;
  /** ...nome del nuovo vault da creare (strategia "per-folder"). */
  newVaultName: string | null;
  items: ItemData[];
}

export interface ImportPlan {
  batches: ImportBatch[];
  /** Elementi scartati perché duplicati. */
  duplicates: number;
  /** Totale di elementi che verranno creati. */
  total: number;
}

/**
 * Chiave di confronto per i duplicati: tipo + host del primo URL (o titolo) +
 * username + password (o note per le note sicure), più TUTTI i dati segreti
 * aggiuntivi (TOTP, note, campi personalizzati). Due login con stesso sito,
 * utente e password ma TOTP/note/campi diversi NON sono duplicati: scartarne uno
 * perderebbe dati. Case-insensitive solo per host, titolo e username.
 */
export function duplicateKey(d: ItemData): string {
  const where = (d.urls[0] && hostOf(d.urls[0])) || d.title.trim().toLowerCase();
  const fields = d.fields.map((f) => `${f.name}=${f.value}`).join("\u0001");
  const extras = [d.totp?.trim() ?? "", d.notes.trim(), fields].join("\u0002");
  if (d.type === "login") return `login|${where}|${d.username.trim().toLowerCase()}|${d.password}|${extras}`;
  if (d.type === "note") return `note|${d.title.trim().toLowerCase()}|${d.notes.trim()}|${fields}`;
  return `${d.type}|${d.title.trim().toLowerCase()}|${fields}|${d.notes.trim()}`;
}

/** Nome del vault per una cartella (percorso "A/B" → "A / B", max 120 caratteri). */
export function vaultNameForFolder(folder: string): string {
  return folder.split("/").join(" / ").slice(0, 120);
}

/**
 * Costruisce il piano: raggruppa per vault di destinazione e scarta i duplicati.
 * `vaults` sono i vault scrivibili dell'utente, `existing` gli item già presenti per vault.
 *
 * Con la strategia "per-folder" una cartella viene associata automaticamente a un
 * vault esistente con lo stesso nome SOLO se è un vault personale di cui l'utente
 * è proprietario: le cartelle di un export privato non finiscono mai in vault di
 * organizzazione (o di altri) solo perché il nome coincide. In quel caso si crea
 * un nuovo vault personale. Il vault scelto esplicitamente (`targetVaultId`) resta
 * invariato per gli item senza cartella.
 */
export function planImport(
  items: ImportedItem[],
  vaults: (Pick<Vault, "id" | "name"> & Partial<Pick<Vault, "organizationId" | "role">>)[],
  existing: Map<string, ItemData[]>,
  opts: ImportPlanOptions,
): ImportPlan {
  const batches = new Map<string, ImportBatch>();
  const seen = new Map<string, Set<string>>();
  const personal = vaults.filter((v) => !v.organizationId && (v.role === undefined || v.role === "owner"));
  const byName = new Map(personal.map((v) => [v.name.trim().toLowerCase(), v.id]));
  let duplicates = 0;
  let total = 0;

  const keysFor = (batchKey: string, vaultId: string | null) => {
    let set = seen.get(batchKey);
    if (!set) {
      set = new Set(vaultId ? (existing.get(vaultId) ?? []).map(duplicateKey) : []);
      seen.set(batchKey, set);
    }
    return set;
  };

  for (const it of items) {
    let vaultId: string | null = opts.targetVaultId;
    let newVaultName: string | null = null;
    if (opts.folders === "per-folder" && it.folder) {
      const name = vaultNameForFolder(it.folder);
      vaultId = byName.get(name.trim().toLowerCase()) ?? null;
      if (!vaultId) newVaultName = name;
    }
    const batchKey = vaultId ? `id:${vaultId}` : `new:${newVaultName!.toLowerCase()}`;
    if (opts.skipDuplicates) {
      const keys = keysFor(batchKey, vaultId);
      const k = duplicateKey(it.data);
      if (keys.has(k)) {
        duplicates++;
        continue;
      }
      keys.add(k);
    }
    let batch = batches.get(batchKey);
    if (!batch) {
      batch = { vaultId, newVaultName, items: [] };
      batches.set(batchKey, batch);
    }
    batch.items.push(it.data);
    total++;
  }
  return { batches: [...batches.values()], duplicates, total };
}

/** Riepilogo per tipo, per l'anteprima nella UI. */
export function summarizeImport(items: ImportedItem[]): Record<ItemData["type"], number> & { folders: number } {
  const out = { login: 0, note: 0, card: 0, identity: 0, folders: 0 };
  const folders = new Set<string>();
  for (const it of items) {
    out[it.data.type]++;
    if (it.folder) folders.add(it.folder);
  }
  out.folders = folders.size;
  return out;
}
