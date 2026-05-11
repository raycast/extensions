export function getHumanDifference(dateString: string): string {
  const formatter = new Intl.RelativeTimeFormat("en", {
    numeric: "auto",
  });

  const date = new Date(dateString);
  const now = new Date();

  const diffInDays = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const diffInDaysAbs = Math.abs(diffInDays);

  if (diffInDaysAbs <= 30.4) {
    return formatter.format(Math.ceil(diffInDays), "days").replace("in", "for");
  } else if (diffInDaysAbs > 30.4 && diffInDaysAbs <= 365) {
    return formatter.format(Math.ceil(diffInDays / 30.4), "months").replace("in", "for");
  } else if (diffInDaysAbs > 365) {
    return formatter.format(Math.ceil(diffInDays / 30.4 / 12), "years").replace("in", "for");
  }

  return "";
}
