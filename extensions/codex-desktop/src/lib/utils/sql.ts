export function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
