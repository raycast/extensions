export function shq(arg: string): string {
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

export function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
