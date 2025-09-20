import { Monzo } from "@marceloclp/monzojs";
import { Color } from "@raycast/api";

export function formatCurrency(value: number, currency: string): string {
  if (!currency) {
    return value.toString();
  }
  const denominator = currency == "JPY" ? 1 : 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(value / denominator);
}

export function formatSortCode(sortCode: string): string {
  if (sortCode.length != 6) {
    throw new Error("Invalid sort code found");
  }
  return `${sortCode.slice(0, 2)}–${sortCode.slice(2, 4)}–${sortCode.slice(
    4,
    6
  )}`;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "short",
});

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export function formatAddress(address: Monzo.Address): string | undefined {
  const components = [address.address, address.city, address.postcode].filter(
    (c) => !!c
  );
  if (!components.length) {
    return undefined;
  }
  return components.join(", ");
}

export function formatCategory(category: string): string {
  return (
    category.slice(0, 1).toUpperCase() + category.replace("_", " ").slice(1)
  );
}

export function colourForCategory(category: string): Color | string {
  switch (category) {
    case "bills":
      return "#00A4DA";
    case "charity":
      return "#13233D";
    case "eating_out":
      return "#7DD324";
    case "entertainment":
      return "#A660FF";
    case "expenses":
      return "#942B01";
    case "family":
      return "#0040C8";
    case "finances":
      return "#00BB4F";
    case "general":
      return "#6F7A89";
    case "gifts":
      return "#A50250";
    case "groceries":
      return "#F5A622";
    case "holidays":
      return "#FF7845";
    case "income":
      return "#00BB4F";
    case "personal_care":
      return "#F33851";
    case "savings":
      return "#85C1E9";
    case "shopping":
      return "#F40084";
    case "transfers":
      return "#174574";
    case "transport":
      return "#02738D";
    case "cash":
      return "#00BB4F";
  }
  return Color.SecondaryText;
}

export function accountTitle(account: Monzo.Accounts.Account): string {
  switch (account.type) {
    case "uk_retail":
      return "Current Account";
    case "uk_retail_joint":
      return "Joint Account";
    case "uk_monzo_flex":
      return "Monzo Flex";
    case "uk_monzo_flex_backing_loan":
      return "Monzo Flex";
  }
}
