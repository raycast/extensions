const formatDate = (date: Date) => date.toISOString().split("T")[0].replace(/-/g, "");

const getScoreDates = (today: Date, numberOfPreviousDays: string | number) => {
  const previousDays = Math.max(0, Math.trunc(Number(numberOfPreviousDays)) || 0);
  const dates = [];

  // UTC arithmetic, because formatDate reads the UTC date: stepping the local
  // calendar across a daylight-saving change would skip or repeat a UTC date.
  for (let offset = previousDays; offset >= 0; offset--) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - offset);
    dates.push(formatDate(date));
  }

  return dates;
};

export { formatDate };
export default getScoreDates;
