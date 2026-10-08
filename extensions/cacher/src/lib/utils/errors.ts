export function isForbidden(error: Error | undefined): boolean {
  return error?.message.toLocaleLowerCase().includes("forbidden") ?? false;
}
