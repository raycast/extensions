export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  const defaultOptions: Intl.NumberFormatOptions = {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };

  const mergedOptions = { ...defaultOptions, ...options };

  return new Intl.NumberFormat("pt-BR", mergedOptions).format(value);
}

export function formatDate(date: Date | null): string {
  if (!date) return "";
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
