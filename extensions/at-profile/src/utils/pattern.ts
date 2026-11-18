const compiled = new Map<string, RegExp>();

/**
 * Whether a username fits a site's pattern. Each pattern is compiled once: a search tests it before checking and
 * again inside the check.
 */
export function fitsPattern(pattern: string, value: string): boolean {
  let regex = compiled.get(pattern);
  if (!regex) {
    regex = new RegExp(pattern);
    compiled.set(pattern, regex);
  }
  return regex.test(value);
}
