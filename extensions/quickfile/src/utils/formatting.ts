export const formatCurrency = (value: number | undefined, currency: string | undefined) => {
  if (value === undefined || value === null) return "";

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
};

export const formatDate = (date: string) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(d);
};
