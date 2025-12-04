import { getLiftProgressCanvas } from "./common-utils";
import { CountdownDate, LifeProgressType } from "../types/types";
import { SectionTitle, SYMBOL_NUM } from "./constants";
import { birthday, weekStart } from "../types/preferences";

export const getBirthDay = () => {
  const nowDate = new Date();
  if (new Date(birthday).getTime() > nowDate.getTime()) {
    return { isValid: false, birthTime: new Date("1995-01-01") };
  }
  if (new Date(birthday).getTime() < new Date(`${nowDate.getFullYear() - 110}-01-01`).getTime()) {
    return { isValid: false, birthTime: new Date("1995-01-01") };
  }
  return { isValid: true, birthTime: new Date(birthday) };
};

export const isBirthDay = () => {
  const now = new Date();
  return now.getDate() === birthTime.getDate() && now.getMonth() === birthTime.getMonth();
};

const birthTime = getBirthDay().birthTime;
const deathTime = new Date(birthTime.getFullYear() + 80, birthTime.getMonth(), birthTime.getDate());
const now = new Date();

// You have spent time in the past
export const getSpendYears = () => {
  return Math.floor(now.getFullYear() - birthTime.getFullYear());
};

export const getSpendDays = () => {
  return Math.floor((now.getTime() - birthTime.getTime()) / (1000 * 60 * 60 * 24));
};

export const getSpendCentury = () => {
  return birthTime.getFullYear() >= 2000 ? 1 : 2;
};

//Your left time until 100 years
export const getLeftNights = () => {
  const leftTime = deathTime.getTime() - now.getTime();
  return Math.floor(leftTime / (1000 * 60 * 60 * 24));
};

export const getLeftPaychecks = () => {
  return {
    spentPaychecks: (now.getFullYear() - birthTime.getFullYear()) * 12 + now.getMonth() - birthTime.getMonth(),
    leftPaychecks: (deathTime.getFullYear() - now.getFullYear()) * 12 + deathTime.getMonth() - now.getMonth(),
  };
};

export const getLeftWeeks = () => {
  return {
    spentWeeks: Math.floor(getSpendDays() / 7),
    leftWeeks: Math.floor(getLeftNights() / 7),
  };
};

//Time left
export const getHourLeftThisDay = () => {
  const now = new Date();
  return 24 - now.getHours() - 1;
};

export const getDaysLeftThisWeek = () => {
  const nowDate = new Date();
  switch (weekStart) {
    case "Sunday":
      return 6 - nowDate.getDay();
    case "Monday":
      if (nowDate.getDay() === 0) {
        return 0;
      } else {
        return 7 - nowDate.getDay();
      }
    case "Tuesday":
      if (nowDate.getDay() <= 1) {
        return 1 - nowDate.getDay();
      } else {
        return 8 - nowDate.getDay();
      }
    case "Wednesday":
      if (nowDate.getDay() <= 2) {
        return 2 - nowDate.getDay();
      } else {
        return 9 - nowDate.getDay();
      }
    case "Thursday":
      if (nowDate.getDay() <= 3) {
        return 3 - nowDate.getDay();
      } else {
        return 10 - nowDate.getDay();
      }
    case "Friday":
      if (nowDate.getDay() <= 4) {
        return 4 - nowDate.getDay();
      } else {
        return 11 - nowDate.getDay();
      }
    case "Saturday":
      if (nowDate.getDay() <= 5) {
        return 5 - nowDate.getDay();
      } else {
        return 12 - nowDate.getDay();
      }
    default:
      return 6 - nowDate.getDay();
  }
};

export const getDaysLeftThisMonth = () => {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return { spentMonth: now.getDate(), leftMonth: daysInMonth - now.getDate(), allMonth: daysInMonth };
};

export const getDaysLeftThisYear = () => {
  const now = new Date();
  const dayAllYear =
    (new Date(now.getFullYear() + 1, 0, 0).getTime() - new Date(now.getFullYear(), 0, 0).getTime()) /
    (1000 * 60 * 60 * 24);
  const daySpendThisYear =
    (new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime() -
      new Date(now.getFullYear(), 0, 0).getTime()) /
    (1000 * 60 * 60 * 24);
  return {
    spentDayThisYear: daySpendThisYear,
    leftDayThisYear: parseInt(dayAllYear - daySpendThisYear + ".0001"),
    allDayThisYear: dayAllYear,
  };
};

export const getLifeProgress = (countdownDates: CountdownDate[]) => {
  const lifeProgresses: LifeProgressType[] = [];

  const timeIcon12 = ["🕚", "🕙", "🕘", "🕗", "🕖", "🕕", "🕔", "🕓", "🕒", "🕑", "🕐", "🕛"];
  const timeIcon24 = [...timeIcon12, ...timeIcon12];

  //you have
  const spentDays = getSpendDays();
  const leftDays = getLeftNights();
  lifeProgresses.push({
    section: SectionTitle.YOU_HAVE,
    icon: buildMeaningfulDaysIcon(spentDays + ""),
    title: `Spent ${spentDays} meaningful days`,
    titleCanvas: {
      canvas: getLiftProgressCanvas(spentDays, leftDays, SYMBOL_NUM).canvas,
      text: getLiftProgressCanvas(spentDays, leftDays, SYMBOL_NUM).text,
    },
    subTitle: "",
    number: spentDays,
    accessUnit: undefined,
  });

  const spentYears = getSpendYears();
  const leftYears = 80 - spentYears;
  lifeProgresses.push({
    section: SectionTitle.YOU_HAVE,
    icon: "🎊",
    title: `Celebrated ${spentYears} New Year's Days`,
    titleCanvas: {
      canvas: getLiftProgressCanvas(spentYears, leftYears, SYMBOL_NUM).canvas,
      text: getLiftProgressCanvas(spentYears, leftYears, SYMBOL_NUM).text,
    },
    subTitle: "",
    number: getSpendYears(),
    accessUnit: undefined,
  });

  const spentCentury = getSpendCentury();
  const leftCentury = 3 - spentCentury;
  lifeProgresses.push({
    section: SectionTitle.YOU_HAVE,
    icon: spentCentury == 1 ? "✈️" : "🚀",
    title: `Witnessed ${spentCentury} great centuries`,
    titleCanvas: {
      canvas: getLiftProgressCanvas(spentCentury, leftCentury, SYMBOL_NUM).canvas,
      text: getLiftProgressCanvas(spentCentury, leftCentury, SYMBOL_NUM).text,
    },
    subTitle: "",
    number: spentCentury,
    accessUnit: undefined,
  });

  //you may be able to
  const { spentPaychecks, leftPaychecks } = getLeftPaychecks();
  lifeProgresses.push({
    section: SectionTitle.YOU_MAY_BE_ABLE_TO,
    icon: "💰",
    title: `Receive ${spentPaychecks} generous paychecks`,
    titleCanvas: {
      canvas: getLiftProgressCanvas(spentPaychecks, leftPaychecks, SYMBOL_NUM).canvas,
      text: getLiftProgressCanvas(spentPaychecks, leftPaychecks, SYMBOL_NUM).text,
    },
    subTitle: "",
    number: spentPaychecks,
    accessUnit: undefined,
  });

  const { spentWeeks, leftWeeks } = getLeftWeeks();
  lifeProgresses.push({
    section: SectionTitle.YOU_MAY_BE_ABLE_TO,
    icon: "🎡",
    title: `Spend ${spentWeeks} pleasant weekends`,
    titleCanvas: {
      canvas: getLiftProgressCanvas(spentWeeks, leftWeeks, SYMBOL_NUM).canvas,
      text: getLiftProgressCanvas(spentWeeks, leftWeeks, SYMBOL_NUM).text,
    },
    subTitle: "",
    number: spentWeeks,
    accessUnit: undefined,
  });

  lifeProgresses.push({
    section: SectionTitle.YOU_MAY_BE_ABLE_TO,
    icon: "🌙",
    title: `Enjoy ${leftDays} wonderful nights`,
    titleCanvas: {
      canvas: getLiftProgressCanvas(spentDays, leftDays, SYMBOL_NUM).canvas,
      text: getLiftProgressCanvas(spentDays, leftDays, SYMBOL_NUM).text,
    },
    subTitle: "",
    number: leftDays,
    accessUnit: undefined,
  });

  //time left
  const leftHour = getHourLeftThisDay();
  lifeProgresses.push({
    section: SectionTitle.COUNTDOWN_DATE,
    icon: timeIcon24[leftHour],
    title: `${leftHour} hours left in the day`,
    titleCanvas: {
      canvas: getLiftProgressCanvas(24 - leftHour, leftHour, 24).canvas,
      text: getLiftProgressCanvas(24 - leftHour, leftHour, 24).text,
    },
    subTitle: "",
    number: leftHour,
    accessUnit: undefined,
  });

  const leftWeek = getDaysLeftThisWeek();
  lifeProgresses.push({
    section: SectionTitle.COUNTDOWN_DATE,
    icon: leftWeek <= 1 ? "🏝" : "💼",
    title: `${leftWeek} days left in the week`,
    titleCanvas: {
      canvas: getLiftProgressCanvas(7 - leftWeek, leftWeek, 7).canvas,
      text: getLiftProgressCanvas(7 - leftWeek, leftWeek, 7).text,
    },
    subTitle: "",
    number: leftWeek,
    accessUnit: undefined,
  });

  const { spentMonth, leftMonth, allMonth } = getDaysLeftThisMonth();
  lifeProgresses.push({
    section: SectionTitle.COUNTDOWN_DATE,
    icon: buildMonthIcon(leftMonth),
    title: `${leftMonth} days left in the month`,
    titleCanvas: {
      canvas: getLiftProgressCanvas(spentMonth, leftMonth, allMonth).canvas,
      text: getLiftProgressCanvas(spentMonth, leftMonth, allMonth).text,
    },
    subTitle: "",
    number: leftMonth,
    accessUnit: undefined,
  });

  const { spentDayThisYear, leftDayThisYear, allDayThisYear } = getDaysLeftThisYear();
  lifeProgresses.push({
    section: SectionTitle.COUNTDOWN_DATE,
    icon: buildYearIcon(leftDayThisYear),
    title: `${leftDayThisYear} days left in the year`,
    titleCanvas: {
      canvas: getLiftProgressCanvas(spentDayThisYear, leftDayThisYear, allDayThisYear).canvas,
      text: getLiftProgressCanvas(spentDayThisYear, leftDayThisYear, allDayThisYear).text,
    },
    subTitle: "",
    number: leftDayThisYear,
    accessUnit: undefined,
  });

  //countdown date
  const now = new Date();
  countdownDates.forEach((value) => {
    let _title;
    let days;
    if (now.getTime() < value.date) {
      days = Math.floor((value.date - now.getTime()) / (1000 * 60 * 60 * 24));
      _title = `${days} days left until ${value.title}`;
    } else {
      days = Math.floor((now.getTime() - value.date) / (1000 * 60 * 60 * 24));
      _title = `${days} days passed since ${value.title}`;
    }
    lifeProgresses.push({
      section: SectionTitle.COUNTDOWN_DATE,
      icon: value.icon,
      title: _title,
      titleCanvas: {
        canvas: new Date(value.date).toLocaleDateString(),
        text: "",
      },
      subTitle: value.description,
      number: leftDayThisYear,
      accessUnit: undefined,
    });
  });

  return { lifeProgresses: lifeProgresses };
};

const buildMeaningfulDaysIcon = (num: string) => {
  if (num.endsWith("0")) return "🌈";
  if (num.endsWith("1")) return "🌤";
  if (num.endsWith("2")) return "⛅️";
  if (num.endsWith("3")) return "🌦";
  if (num.endsWith("4")) return "🌧";
  if (num.endsWith("5")) return "⛈️";
  if (num.endsWith("6")) return "🌨";
  if (num.endsWith("7")) return "🌥";
  if (num.endsWith("8")) return "☀️";
  if (num.endsWith("9")) return "🌈";
  return "🌈";
};

const buildMonthIcon = (num: number) => {
  if (num <= 3) return "🌑";
  if (num <= 7) return "🌘";
  if (num <= 11) return "🌗";
  if (num <= 14) return "🌖";
  if (num <= 18) return "🌕";
  if (num <= 21) return "🌔";
  if (num <= 24) return "🌓";
  if (num <= 28) return "🌒";
  return "🌑";
};

const buildYearIcon = (num: number) => {
  if (num <= 3) return "🎊";
  if (num <= 10) return "🎁";
  if (num <= 40) return "🏮";
  if (num <= 80) return "❄️";
  if (num <= 120) return "🪆";
  if (num <= 150) return "🍁";
  if (num <= 180) return "🎐";
  if (num <= 220) return "⛱";
  if (num <= 260) return "🌸";
  if (num <= 300) return "🏮";
  if (num <= 330) return "🧨";
  if (num <= 355) return "🎉";
  return "🎊";
};
