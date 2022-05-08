export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export const padStart = (str: string | number, length: number): string => {
  return String(str).padStart(length, " ");
};

const fmt = new Intl.NumberFormat("en", { notation: "compact" });

export function compactNumberFormat(num: number): string {
  return fmt.format(num);
}
