import { environment, getPreferenceValues } from "@raycast/api";
import { getLiftProgressCanvas } from "./common-utils";
import { LifeProgress } from "../types/types";
import { allTheme, numberPathList, SectionTitle, SYMBOL_NUM } from "./constants";
import { birthday, birthdayEveryDay, iconTheme, Preferences, weekStart } from "../types/preferences";

export const getBirthDay = () => {
  const nowDate = new Date();
  if (new Date(birthday).getTime() > nowDate.getTime()) {
    return { isValid: false, birthTime: new Date("1995-01-01") };
  }
  if (new Date(birthday).getTime() < new Date(`${nowDate.getFullYear() - 110}-01-01`).getTime()) {
    return { isValid: false, birthTime: new Date("1995-01-01") };
  }
  if (birthdayEveryDay) {
    nowDate.setFullYear(new Date(birthday).getFullYear());
    return { isValid: true, birthTime: nowDate };
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

export const getLifeProgress = () => {
  const raycastTheme = environment.theme;
  const lifeProgresses: LifeProgress[] = [];

  const timeIcon12 = ["🕚", "🕙", "🕘", "🕗", "🕖", "🕕", "🕔", "🕓", "🕒", "🕑", "🕐", "🕛"];
  const timeIcon24 = [...timeIcon12, ...timeIcon12];
  let _iconTheme = iconTheme;
  if (iconTheme == "random") {
    _iconTheme = allTheme[Math.floor(Math.random() * allTheme.length)];
  }
  if (_iconTheme == "simple" && raycastTheme == "dark") {
    _iconTheme = _iconTheme + "-dark";
  }
  const meaningfulDaysIcon = (num: number) => {
    if (num < 5475) {
      return "☁️";
    }
    if (num < 7300) {
      return "🌥";
    }
    if (num < 9125) {
      return "⛅️";
    }
    if (num < 10950) {
      return "🌤";
    }
    return "☀️";
  };

  const spentDays = getSpendDays();
  const leftDays = getLeftNights();
  lifeProgresses.push({
    section: SectionTitle.YOU_HAVE,
    icon: meaningfulDaysIcon(spentDays),
    title: `Spent ${spentDays} meaningful days`,
    titleCanvas: {
      canvas: getLiftProgressCanvas(spentDays, leftDays, SYMBOL_NUM).canvas,
      text: getLiftProgressCanvas(spentDays, leftDays, SYMBOL_NUM).text,
    },
    number: spentDays,
    accessUnit: getNumberCanvas(_iconTheme, spentDays),
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
    number: getSpendYears(),
    accessUnit: getNumberCanvas(_iconTheme, spentYears),
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
    number: spentCentury,
    accessUnit: getNumberCanvas(_iconTheme, spentCentury),
  });

  const { spentPaychecks, leftPaychecks } = getLeftPaychecks();
  lifeProgresses.push({
    section: SectionTitle.YOU_MAY_BE_ABLE_TO,
    icon: "💰",
    title: `Receive ${spentPaychecks} generous paychecks`,
    titleCanvas: {
      canvas: getLiftProgressCanvas(spentPaychecks, leftPaychecks, SYMBOL_NUM).canvas,
      text: getLiftProgressCanvas(spentPaychecks, leftPaychecks, SYMBOL_NUM).text,
    },
    number: spentPaychecks,
    accessUnit: getNumberCanvas(_iconTheme, spentPaychecks),
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
    number: spentWeeks,
    accessUnit: getNumberCanvas(_iconTheme, spentWeeks),
  });

  lifeProgresses.push({
    section: SectionTitle.YOU_MAY_BE_ABLE_TO,
    icon: "🌙",
    title: `Enjoy ${leftDays} wonderful nights`,
    titleCanvas: {
      canvas: getLiftProgressCanvas(spentDays, leftDays, SYMBOL_NUM).canvas,
      text: getLiftProgressCanvas(spentDays, leftDays, SYMBOL_NUM).text,
    },
    number: leftDays,
    accessUnit: getNumberCanvas(_iconTheme, leftDays),
  });

  const leftHour = getHourLeftThisDay();
  lifeProgresses.push({
    section: SectionTitle.TIME_LEFT,
    icon: timeIcon24[leftHour],
    title: `${leftHour} hours left in the day`,
    titleCanvas: {
      canvas: getLiftProgressCanvas(24 - leftHour, leftHour, 24).canvas,
      text: getLiftProgressCanvas(24 - leftHour, leftHour, 24).text,
    },
    number: leftHour,
    accessUnit: getNumberCanvas(_iconTheme, leftHour),
  });

  const leftWeek = getDaysLeftThisWeek();
  lifeProgresses.push({
    section: SectionTitle.TIME_LEFT,
    icon: leftWeek <= 1 ? "🏝" : "💼",
    title: `${leftWeek} days left in the week`,
    titleCanvas: {
      canvas: getLiftProgressCanvas(7 - leftWeek, leftWeek, 7).canvas,
      text: getLiftProgressCanvas(7 - leftWeek, leftWeek, 7).text,
    },
    number: leftWeek,
    accessUnit: getNumberCanvas(_iconTheme, leftWeek),
  });

  const { spentMonth, leftMonth, allMonth } = getDaysLeftThisMonth();
  lifeProgresses.push({
    section: SectionTitle.TIME_LEFT,
    icon: leftMonth < 15 ? "⌛️" : "⏳",
    title: `${leftMonth} days left in the month`,
    titleCanvas: {
      canvas: getLiftProgressCanvas(spentMonth, leftMonth, allMonth).canvas,
      text: getLiftProgressCanvas(spentMonth, leftMonth, allMonth).text,
    },
    number: leftMonth,
    accessUnit: getNumberCanvas(_iconTheme, leftMonth),
  });

  const { spentDayThisYear, leftDayThisYear, allDayThisYear } = getDaysLeftThisYear();
  lifeProgresses.push({
    section: SectionTitle.TIME_LEFT,
    icon: leftDayThisYear < 182 ? "🎇" : "🎆",
    title: `${leftDayThisYear} days left in the year`,
    titleCanvas: {
      canvas: getLiftProgressCanvas(spentDayThisYear, leftDayThisYear, allDayThisYear).canvas,
      text: getLiftProgressCanvas(spentDayThisYear, leftDayThisYear, allDayThisYear).text,
    },
    number: leftDayThisYear,
    accessUnit: getNumberCanvas(_iconTheme, leftDayThisYear),
  });

  if (isBirthDay()) {
    lifeProgresses.forEach((value, index) => {
      lifeProgresses[index].icon = "🎉";
      lifeProgresses[index].accessUnit.map((v, i) => {
        lifeProgresses[index].accessUnit[i] = { icon: "🎉" };
      });
    });

    //Hide Cake
    const random10 = Math.floor(Math.random() * lifeProgresses.length);
    const random2 = Math.floor(Math.random() * 2);
    if (random2 == 0) {
      lifeProgresses[random10].icon = "🎂";
    } else {
      const randomAccessUnit = Math.floor(Math.random() * lifeProgresses[random10].accessUnit.length);
      lifeProgresses[random10].accessUnit[randomAccessUnit].icon = "🎂";
    }
    return { lifeProgresses: lifeProgresses, cakeIndex: random10 };
  }
  return { lifeProgresses: lifeProgresses, cakeIndex: 0 };
};

export const getNumberCanvas = (iconTheme: string, number: number) => {
  const _numberPathList = numberPathList(iconTheme);

  const _numberList = (number + "").split("");
  const numberPaths: { icon: string }[] = [];
  for (const _number of _numberList) {
    _numberPathList.forEach((numberPathValue) => {
      if (numberPathValue.value === _number) {
        numberPaths.push({ icon: numberPathValue.path });
        return;
      }
    });
  }
  return numberPaths;
};
