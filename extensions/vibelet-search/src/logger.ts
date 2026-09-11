/** Internal logging — surfaces in `ray develop` console without breaking the user. */
export function warn(...args: unknown[]): void {
  console.warn("[vibelet]", ...args);
}
