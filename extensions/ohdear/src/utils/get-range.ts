export function getDateRange() {
  const startDate = new Date();
  const endDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const formattedStartDate = startDate.toISOString().split("T")[0].replaceAll("-", "") + "000000";
  const formattedEndDate = endDate.toISOString().split("T")[0].replaceAll("-", "") + "235959";

  return [formattedStartDate, formattedEndDate];
}
