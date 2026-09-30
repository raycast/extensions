export const formatCurrency = (num: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "DKK" }).format(num);
