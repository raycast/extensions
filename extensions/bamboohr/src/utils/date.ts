export function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getLastDateOfCurrentYear(): string {
  const currentYear = new Date().getFullYear();
  const lastDate = new Date(currentYear, 11, 31); // Months are zero-based (0 = January, 11 = December)

  const formattedDate = lastDate.toISOString().split("T")[0];

  return formattedDate;
}

export function getDaysLeftInYear(): number {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const nextYear = currentYear + 1;
  const endOfYear = new Date(nextYear, 0, 1);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.floor((endOfYear.getTime() - currentDate.getTime()) / millisecondsPerDay);

  return daysLeft;
}
