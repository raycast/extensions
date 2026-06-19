const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export const formatDate = (value: number): string =>
  dateFormatter.format(value);

export const formatDateTime = (value: number): string =>
  dateTimeFormatter.format(value);
