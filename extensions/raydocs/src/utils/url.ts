export function resolveRelativePath(path: string, currentDocUrl: string): string {
  // Handle anchor links
  if (path?.startsWith("#")) {
    return `${currentDocUrl}${path}`;
  }

  // Don't modify absolute URLs
  if (path?.startsWith("http")) {
    return path;
  }

  // Build the proper URL based on the current document path
  const lastSlashIndex = currentDocUrl.lastIndexOf("/");
  const baseUrl = lastSlashIndex !== -1 ? currentDocUrl.substring(0, lastSlashIndex) : currentDocUrl;

  // Count the number of '../' prefixes and process them
  let depth = 0;
  let normalizedPath = path;
  while (normalizedPath.startsWith("../")) {
    depth++;
    normalizedPath = normalizedPath.slice(3); // Remove one "../"
  }

  // Go up the directory tree based on depth
  let resolvedBaseUrl = baseUrl;
  for (let i = 0; i < depth; i++) {
    const lastSlashIndex = resolvedBaseUrl.lastIndexOf("/");
    if (lastSlashIndex === -1) {
      break; // Can't go up any further
    }
    resolvedBaseUrl = resolvedBaseUrl.substring(0, lastSlashIndex);
  }

  // Handle './' prefix
  if (normalizedPath.startsWith("./")) {
    normalizedPath = normalizedPath.slice(2);
  }

  return `${resolvedBaseUrl}/${normalizedPath}`;
}
