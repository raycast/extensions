const MAX_PREVIOUS_SCORE_DAYS = 30;

const formatDate = (date: Date) => date.toISOString().split("T")[0].replace(/-/g, "");

const getScoreDates = (today: Date, numberOfPreviousDays: string | number) => {
  // The preference is a free-text field: anything that is not a finite number
  // of days counts as "no previous days" rather than an endless loop.
  const parsedDays = Number(numberOfPreviousDays);
  const previousDays = Math.min(
    Number.isFinite(parsedDays) ? Math.max(0, Math.trunc(parsedDays)) : 0,
    MAX_PREVIOUS_SCORE_DAYS,
  );
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
