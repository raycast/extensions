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
import { createHash } from "node:crypto";

export const CLIPBOARD_MARKER_KEY = "passig.clipboardMarker";
export const CLIPBOARD_CLEAR_AFTER_MS = 30_000;

interface ClipboardMarker {
  hash: string;
  at: number;
}

function hashOf(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export async function copySecret(text: string): Promise<void> {
  await Clipboard.copy(text, { concealed: true });
  const marker: ClipboardMarker = { hash: hashOf(text), at: Date.now() };
  await LocalStorage.setItem(CLIPBOARD_MARKER_KEY, JSON.stringify(marker));
  const timer = setTimeout(() => {
    void clearIfStillSecret();
  }, CLIPBOARD_CLEAR_AFTER_MS);
  // non tenere vivo il processo solo per il timer
  timer.unref?.();
}

/** Svuota gli appunti se contengono ancora il segreto copiato (e sono passati ≥ 30 s). */
export async function clearIfStillSecret(force = false): Promise<boolean> {
  const raw = await LocalStorage.getItem<string>(CLIPBOARD_MARKER_KEY);
  if (!raw) return false;
  let marker: ClipboardMarker;
  try {
    marker = JSON.parse(raw) as ClipboardMarker;
  } catch {
    await LocalStorage.removeItem(CLIPBOARD_MARKER_KEY);
    return false;
  }
  if (!force && Date.now() - marker.at < CLIPBOARD_CLEAR_AFTER_MS) return false;
  await LocalStorage.removeItem(CLIPBOARD_MARKER_KEY);
  const current = await Clipboard.readText();
  if (current && hashOf(current) === marker.hash) {
    await Clipboard.clear();
    return true;
  }
  return false;
}
