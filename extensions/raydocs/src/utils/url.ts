export function resolveRelativePath(path: string, currentDocUrl: string, dots?: string): string {
  // Handle anchor links
  if (path.startsWith("#")) {
    return `${currentDocUrl}${path}`;
  }

  // Don't modify absolute URLs
  if (path.startsWith("http")) {
    return path;
  }

  // Build the proper URL based on the current document path
  const baseUrl = currentDocUrl.substring(0, currentDocUrl.lastIndexOf("/"));

  let depth = 0;

  // Count the number of '../' to determine how far up to go
  if (dots) {
    depth = (dots.match(/\.\.\//g) || []).length;
  }

  // Go up the directory tree based on depth
  let resolvedBaseUrl = baseUrl;
  for (let i = 0; i < depth; i++) {
    resolvedBaseUrl = resolvedBaseUrl.substring(0, resolvedBaseUrl.lastIndexOf("/"));
  }

  // Normalize path by removing leading '/' or './'
  let normalizedPath = path;

  if (normalizedPath.startsWith("/")) {
    normalizedPath = normalizedPath.slice(1);
  } else if (normalizedPath.startsWith("./")) {
    normalizedPath = normalizedPath.slice(2);
  }

  return `${resolvedBaseUrl}/${normalizedPath}`;
}
