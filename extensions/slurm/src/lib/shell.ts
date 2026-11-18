export function shellQuote(s: string): string {
  if (!s) return "''";
  if (/^[A-Za-z0-9_./%:=,@+-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, "'\\''")}'`;
}
