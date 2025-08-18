export function getDateWithOffset(offsetHrs?: number): Date {
  const date = new Date();

  if (offsetHrs !== undefined) {
    date.setHours(date.getHours() + offsetHrs);
  }

  return date;
}
