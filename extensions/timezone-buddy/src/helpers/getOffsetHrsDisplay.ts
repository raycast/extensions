export function getOffsetHrsDisplay(currentTimeOffsetHrs: number): string {
  const offsetSign = currentTimeOffsetHrs > 0 ? "+" : "";
  const offsetHrsDisplay = `${offsetSign}${currentTimeOffsetHrs} hr${currentTimeOffsetHrs === 1 ? "" : "s"}`;
  return offsetHrsDisplay;
}
