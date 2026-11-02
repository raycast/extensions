const formatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export function dateLabel(date: Date) {
  return formatter.format(date);
}
