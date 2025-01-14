export const getMonthName = (monthNumber: number) => {
  const date = new Date();
  date.setMonth(monthNumber - 1); // Subtract 1 to account for 0-based indexing
  return date.toLocaleString("default", { month: "long" });
};

export const getDayName = (dayNumber: number) => {
  const date = new Date();
  date.setDate(dayNumber);
  return date.toLocaleString("default", { weekday: "long" });
};

export const getDayNameShort = (dayNumber: number) => {
  const date = new Date();
  date.setDate(dayNumber);
  return date.toLocaleString("default", { weekday: "short" });
};

export const getDayNameAll = () => {
  return Array.from({ length: 7 }, (_, i) => getDayNameShort(i + 1));
};
