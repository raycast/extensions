export const currency = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

const dateDisplay = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const day = String(iso).split("T")[0] ?? String(iso);
  const t = new Date(`${day}T12:00:00.000Z`).getTime();
  return Number.isNaN(t) ? iso : dateDisplay.format(new Date(t));
}

export function truncateName(name: string, max: number): string {
  return name.length <= max ? name : `${name.slice(0, max)}…`;
}
