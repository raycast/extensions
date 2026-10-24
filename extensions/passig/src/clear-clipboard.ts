import { clearIfStillSecret } from "./lib/clipboard";

/**
 * Comando in background (ogni minuto): svuota gli appunti se contengono ancora
 * il segreto copiato almeno 30 secondi fa. Vedi lib/clipboard.ts.
 */
export default async function ClearClipboardCommand() {
  await clearIfStillSecret();
}
