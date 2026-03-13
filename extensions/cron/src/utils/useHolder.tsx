export function getUpdateSearch(time: string, timeFormat: boolean) {
  const holderWidth = timeFormat ? 70 : 75;
  const holderTitle = "Cron";
  const holderEllipsis = " ".repeat(11); // Hide the ellipsis
  const spacesNeeded = holderWidth - (holderTitle.length + time.length);
  return `${holderTitle}${" ".repeat(spacesNeeded)}${time}${holderEllipsis}`;
}
