export function parseIntervalMs(value: string | undefined): number {
  const raw = (value ?? "10s").trim().toLowerCase();
  const match = /^(\d+)\s*(s|m|h)$/.exec(raw);
  if (!match) return 10_000;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return 10_000;
  switch (match[2]) {
    case "s":
      return amount * 1000;
    case "h":
      return amount * 60 * 60 * 1000;
    case "m":
    default:
      return amount * 60 * 1000;
  }
}
