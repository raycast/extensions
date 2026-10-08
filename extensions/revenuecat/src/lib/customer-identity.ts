import type { Customer } from "./explorer-api";
function attribute(customer: Customer, name: string) {
  const value = customer.attributes?.items.find((item) => item.name === name)?.value;
  return typeof value === "string" ? value.trim() || undefined : undefined;
}
export function customerEmail(customer: Customer) {
  return attribute(customer, "$email");
}
export function customerName(customer: Customer) {
  return attribute(customer, "$displayName") || customerEmail(customer) || customer.id;
}
