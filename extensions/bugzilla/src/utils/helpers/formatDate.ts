export function convertUTCDateToLocalDate(dateString: string) {
  const date = new Date(dateString);
  const newDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return newDate;
}
