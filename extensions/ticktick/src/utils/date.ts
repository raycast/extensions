export const convertMacTime2JSTime = (time: number) => {
  return time * 1000;
};

export const getSectionNameByDate = (date: Date) => {
  const today = new Date();
  const yesterday = getYesterdayDate();
  const dateYYYYMMDD = YYYYMMDD(date);
  if (YYYYMMDD(today) === dateYYYYMMDD) {
    return "Today";
  } else if (YYYYMMDD(yesterday) === dateYYYYMMDD) {
    return "Overdue";
  }
  return "";
};

function getYesterdayDate() {
  return new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
}

const YYYYMMDD = (date: Date) => {
  return `${date.getFullYear()}${date.getMonth()}${date.getDate()}`;
};
