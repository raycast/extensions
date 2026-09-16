export function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function withTrailingSlash(value: string): string {
  return `${withoutTrailingSlash(value)}/`;
}
