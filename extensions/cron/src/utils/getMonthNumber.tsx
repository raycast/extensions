import fuzzyMatch from "u/fuzzyMatch";

export default function getMonthNumber(monthName: string): number {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const index = months.findIndex((month) => fuzzyMatch(monthName, month));
  return index !== -1 ? index + 1 : -1;
}
