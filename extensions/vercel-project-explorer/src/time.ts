// https://twitter.com/swyx/status/1541268395521413120
const rtf = new Intl.RelativeTimeFormat("en", {
  localeMatcher: "best fit",
  numeric: "always",
  style: "long",
});

function getDifferenceInDays(fromDate: Date | number, toDate: Date | number) {
  if (typeof fromDate === "number" && typeof toDate === "number") {
    const diff = Math.floor((fromDate - toDate) / (1000 * 60 * 60 * 24));
    return rtf.format(diff, "day");
  } else {
    const diff = Math.floor((new Date(fromDate).getTime() - new Date(toDate).getTime()) / (1000 * 60 * 60 * 24));
    return rtf.format(diff, "day");
  }
}

function fromNow(date: Date | number) {
  return getDifferenceInDays(date, new Date());
}

export { getDifferenceInDays, fromNow };
