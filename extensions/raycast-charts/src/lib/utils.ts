export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

const fmt = new Intl.NumberFormat("en", { notation: "compact" });

export function compactNumberFormat(num: number): string {
  return fmt.format(num);
}
