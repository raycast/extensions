/** Abbreviate a contract address for display, e.g. `0x1234…cdef`. */
export function shortCa(ca: string): string {
  return ca.length <= 12 ? ca : `${ca.slice(0, 6)}…${ca.slice(-4)}`;
}
