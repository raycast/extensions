/**
 * Copia "nascosta" negli appunti con cancellazione automatica dopo 30 s.
 *
 * Il processo di un comando Raycast termina poco dopo la chiusura della
 * finestra, quindi un semplice setTimeout non basta. Strategia a due livelli:
 * 1. se il processo è ancora vivo dopo 30 s, cancella subito;
 * 2. in ogni caso scrive un "marker" (hash SHA-256 del segreto + timestamp)
 *    in LocalStorage: il comando in background `clear-clipboard` (ogni minuto)
 *    svuota gli appunti se contengono ancora lo stesso segreto.
 * Negli appunti non viene mai salvato l'hash in chiaro del contenuto futuro: si
 * confronta solo l'hash del contenuto corrente.
 */
import { Clipboard, LocalStorage } from "@raycast/api";
import { createHash, randomUUID } from "node:crypto";

/** Prefisso delle chiavi dei marker: una chiave distinta per ogni copia. */
export const CLIPBOARD_MARKER_KEY = "passig.clipboardMarker";
export const CLIPBOARD_CLEAR_AFTER_MS = 30_000;

interface ClipboardMarker {
  hash: string;
  at: number;
}

function hashOf(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Ogni copia scrive un marker con una chiave PROPRIA (`passig.clipboardMarker.<id>`):
 * la pulizia rimuove solo le chiavi che ha letto ed elaborato, quindi una copia
 * fatta nel frattempo da un altro comando non può mai perdere il proprio marker
 * (niente read-modify-write su una chiave condivisa).
 */
export async function copySecret(text: string): Promise<void> {
  const marker: ClipboardMarker = { hash: hashOf(text), at: Date.now() };
  const key = `${CLIPBOARD_MARKER_KEY}.${marker.at}.${randomUUID()}`;
  await LocalStorage.setItem(key, JSON.stringify(marker));
  await Clipboard.copy(text, { concealed: true });
  const timer = setTimeout(() => {
    void clearIfStillSecret();
  }, CLIPBOARD_CLEAR_AFTER_MS);
  // non tenere vivo il processo solo per il timer
  timer.unref?.();
}

/**
 * Svuota gli appunti se contengono ancora un segreto copiato da almeno 30 s
 * (con `force`, indipendentemente dall'età: usato dal blocco). Rimuove solo i
 * marker scaduti/elaborati; quelli più recenti restano per la pulizia successiva.
 */
export async function clearIfStillSecret(force = false): Promise<boolean> {
  const all = await LocalStorage.allItems<Record<string, string>>();
  const now = Date.now();
  const due: { key: string; marker: ClipboardMarker | null }[] = [];
  for (const [key, raw] of Object.entries(all)) {
    if (key !== CLIPBOARD_MARKER_KEY && !key.startsWith(`${CLIPBOARD_MARKER_KEY}.`)) continue;
    let marker: ClipboardMarker | null = null;
    try {
      marker = JSON.parse(String(raw)) as ClipboardMarker;
    } catch {
      marker = null; // marker corrotto: va solo rimosso
    }
    if (marker && !force && now - marker.at < CLIPBOARD_CLEAR_AFTER_MS) continue;
    due.push({ key, marker });
  }
  if (due.length === 0) return false;

  let cleared = false;
  const current = await Clipboard.readText();
  if (current) {
    const h = hashOf(current);
    if (due.some((d) => d.marker?.hash === h)) {
      await Clipboard.clear();
      cleared = true;
    }
  }
  for (const d of due) await LocalStorage.removeItem(d.key);
  return cleared;
}
