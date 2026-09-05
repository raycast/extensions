export function stripNoise<T>(manifest: T): T {
  if (!manifest || typeof manifest !== "object") return manifest;
  const clone = JSON.parse(JSON.stringify(manifest)) as { metadata?: { managedFields?: unknown } };
  if (clone.metadata && "managedFields" in clone.metadata) {
    delete clone.metadata.managedFields;
  }
  return clone as T;
}
