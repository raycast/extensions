const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default function formatDate(date: number) {
  const today = new Date();
  const yesterday = (() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  })();
  const then = new Date(date);

  if (today.toDateString() === then.toDateString()) {
    return "Today";
  }

  if (yesterday.toDateString() === then.toDateString()) {
    return "Yesterday";
  }

  return dateTimeFormat.format(then);
}
