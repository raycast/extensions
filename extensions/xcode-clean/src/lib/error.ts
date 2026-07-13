/**
 * Turn any thrown value into a single-line, human-readable string suitable for
 * a Toast. Collapses real newlines and any literal "\n" sequences (which some
 * tools embed in error text) into single spaces, so multi-line gradle/exec
 * errors don't show raw line breaks in the UI.
 */
export function formatError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  return raw.replace(/\\n/g, " ").replace(/\s+/g, " ").trim();
}
