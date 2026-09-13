/**
 * Reduces a document reference to a name that is safe as a single path segment. Dolibarr references
 * are tame in practice, but a slash or a ".." in one would otherwise escape the cache directory.
 */
export function safeFileName(ref: string): string {
  const cleaned = ref.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "_");
  return cleaned.length > 0 ? cleaned.slice(0, 100) : "document";
}
