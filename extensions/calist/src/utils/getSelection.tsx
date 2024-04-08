export const getSelection = (
  id: string | null,
  setCurrentWeek: (week: number) => void,
  setSelectedDay: (day: number) => void,
  getWeek: (date: Date) => number,
  currentYear: number,
  currentMonth: number,
) => {
  const getSidValue = (id: string) => {
    const parts = id.split(", ");
    const sidPart = parts.find((part) => part.startsWith("SID:"));
    return sidPart ? sidPart.replace("SID:", "") : "";
  };

  if (id && id.includes("SIT:week")) {
    const sidValue = getSidValue(id);
    setCurrentWeek(parseInt(sidValue));
  } else {
    const day = getSidValue(id ?? "");
    const parsedDay = parseInt(day);

    if (!isNaN(parsedDay) && parsedDay !== 0) {
      const weekOfYear = getWeek(new Date(currentYear, currentMonth - 1, parsedDay));
      setCurrentWeek(weekOfYear);
      setSelectedDay(parsedDay);
    }
  }
};
