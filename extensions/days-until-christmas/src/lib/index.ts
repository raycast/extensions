export const calculate = ({
  currDate,
  neededDate,
}: {
  currDate: Date;
  neededDate: Date;
}): { days: number; hours: number; isToday: boolean } => {
  const timeInADay = 24 * 60 * 60;
  const diff = (neededDate.getTime() - currDate.getTime()) / 1000;

  const days = Math.floor(diff / timeInADay);
  const hours = Math.floor((diff / timeInADay - days) * 24);

  if (days === -1) {
    return {
      days: 0,
      hours: 0,
      isToday: true,
    };
  } else if (days < 0) {
    const newNeededDate = new Date(neededDate);

    newNeededDate.setFullYear(neededDate.getFullYear() + 1);

    return calculate({
      currDate,
      neededDate: newNeededDate,
    });
  }

  return {
    days,
    hours,
    isToday: false,
  };
};

export const format = (input: number, word: string) => {
  if (input > 1) {
    return `${input} ${word}s`;
  }

  return `${input} ${word}`;
};
