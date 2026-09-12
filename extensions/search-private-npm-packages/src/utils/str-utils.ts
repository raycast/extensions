export function buildStr(str: string, params?: Record<string, string>) {
  if (!params) {
    return str;
  }
  for (const key in params) {
    str = str.replace(`$${key}`, params[key]);
  }
  return str;
}
