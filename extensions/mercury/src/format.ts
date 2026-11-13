import { Account } from "./mercury";

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** "−$6.75" / "+$1,900.00": the sign carries the direction. */
export function formatSignedCurrency(amount: number): string {
  return `${amount < 0 ? "−" : "+"}${formatCurrency(Math.abs(amount))}`;
}

/** "interestPosted" → "Interest Posted" */
export function humanize(value: string): string {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function accountLabel(account: Pick<Account, "name" | "nickname">): string {
  return account.nickname || account.name;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });
}

/**
 * Label + value lines with the values aligned in one column and blank lines between groups.
 * Used for "Copy as Text" and saved wire details, which get pasted into emails and invoices.
 */
export function alignedText(heading: string[], groups: Array<Array<[string, string | undefined | null]>>): string {
  const rows = groups.map((group) => group.filter((row): row is [string, string] => Boolean(row[1])));
  const width = Math.max(...rows.flat().map(([label]) => label.length)) + 3;
  const body = rows
    .filter((group) => group.length > 0)
    .map((group) =>
      group
        .map(([label, value]) =>
          value
            .split("\n")
            .map((line, index) => (index === 0 ? label.padEnd(width) : " ".repeat(width)) + line)
            .join("\n"),
        )
        .join("\n"),
    );
  return [heading.join("\n"), ...body].join("\n\n") + "\n";
}

/** "1 statement", "3 statements". */
export function countOf(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}
