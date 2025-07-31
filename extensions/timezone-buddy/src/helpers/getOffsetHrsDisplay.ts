export function getOffsetHrsDisplay(currentTimeOffsetHrs: number): string {
  const offsetSign = currentTimeOffsetHrs >= 0 ? "+" : "-";
  const offsetHrsAbs = Math.abs(currentTimeOffsetHrs);

  const offsetHrsDisplay = `${offsetSign}${offsetHrsAbs} hr${offsetHrsAbs === 1 ? "" : "s"}`;
  return offsetHrsDisplay;
}
