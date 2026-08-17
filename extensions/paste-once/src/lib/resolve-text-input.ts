export function resolveTextInput(argument?: string, clipboard?: string): string | null {
  const fromArgument = argument?.trim();
  if (fromArgument) return fromArgument;

  const fromClipboard = clipboard?.trim();
  if (fromClipboard) return fromClipboard;

  return null;
}
