const dateTimeOptions: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

export function formatNoteDate(date: Date): string {
  return date.toLocaleString("en-US", dateTimeOptions);
}
