const LEAP_YEAR = 2024;
const MONTHS_IN_YEAR = 12;

export const getDaysInMonth = (month: number) => {
  const date = new Date(LEAP_YEAR, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const getAllValidDates = () => {
  const validDates: Date[] = [];
  for (let month = 0; month < MONTHS_IN_YEAR; month++) {
    const days = getDaysInMonth(month);
    for (let day = 0; day < days.length; day++) {
      validDates.push(days[day]);
    }
  }
  return validDates;
};

export const validDates = getAllValidDates();
