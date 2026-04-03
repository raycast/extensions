/**
 * Parses a song title from a filename by stripping the extension
 * and common recording/session suffixes.
 */
export function parseTitle(filename: string): string {
  // Strip file extension
  let title = filename.replace(/\.[^.]+$/, "");

  // Strip trailing version numbers: _v1.0, v2, etc. (must be at end of string)
  title = title.replace(/\s*[_\s]v\d[\d.]*\s*$/gi, "").trim();

  // Strip day markers and everything after: _Day2..., _DAy1..., - Day2...
  title = title.replace(/\s*[-_]\s*[Dd][Aa]?[Yy]\d+.*/g, "");

  // Strip mix type descriptors: _GIANT Mix, _Rough Mix, etc.
  title = title.replace(/_[A-Z][A-Z\s]+Mix\s*$/i, "");

  // Strip artist name suffixes: _Gabe Douglas... (Capital Word Capital Word)
  title = title.replace(/_[A-Z][a-z]+ [A-Z][a-z]+.*/g, "");

  // Strip trailing date patterns: _Dec12, _Nov2025
  title = title.replace(/[_\s][A-Z][a-z]{2}\d+$/, "");

  return title.trim();
}
