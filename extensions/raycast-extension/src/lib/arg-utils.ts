export function pushOptionalArg(args: string[], value: string | undefined): void {
  if (!value) {
    return;
  }
  const trimmed = value.trim();
  if (trimmed.length > 0) {
    args.push(trimmed);
  }
}

export function pushOption(args: string[], flag: string, value: string | undefined): void {
  if (!value) {
    return;
  }
  const trimmed = value.trim();
  if (trimmed.length > 0) {
    args.push(flag, trimmed);
  }
}
