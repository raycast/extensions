import { environment } from "@raycast/api";
import { preferences } from "./common-utils";

export const getBirthDay = () => {
  const nowDate = new Date();
  const preferencesBirthday = preferences().birthday.replace(" ", "");
  if (new Date(preferencesBirthday).getTime() > nowDate.getTime()) {
    return { isValid: false, birthTime: new Date("1995-01-01") };
  }
  if (new Date(preferencesBirthday).getTime() < new Date(`${nowDate.getFullYear() - 110}-01-01`).getTime()) {
    return { isValid: false, birthTime: new Date("1995-01-01") };
  }
  return { isValid: true, birthTime: new Date(preferencesBirthday) };
};

const birthTime = getBirthDay().birthTime;
const deathTime = new Date(birthTime.getFullYear() + 80, birthTime.getMonth(), birthTime.getDate());
const now = new Date();
const { weekStart } = preferences();

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
  return (deathTime.getFullYear() - now.getFullYear()) * 12 + deathTime.getMonth() - now.getMonth();
};

export const getLeftWeeks = () => {
  return Math.floor(getLeftNights() / 7);
};

//Time left
export const getHourLeftThisDay = () => {
  const now = new Date();
  return 24 - now.getHours() - 1;
};

export const getDaysLeftThisWeek = () => {
  const now = new Date();
  switch (weekStart) {
    case "Monday":
      if (now.getDay() === 0) {
        return 0;
      } else {
        return 7 - now.getDay();
      }
    case "Sunday":
      return 6 - now.getDay();
    default:
      return 6 - now.getDay();
  }
};

export const getDaysLeftThisMonth = () => {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return daysInMonth - now.getDate();
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
  return parseInt(dayAllYear - daySpendThisYear + ".0001");
};

export interface LifeProgress {
  section: string;
  icon: string;
  title: string;
  number: number;
  accessUnit: { icon: string }[];
}

export const isBirthDay = () => {
  const now = new Date();
  return now.getDate() === birthTime.getDate() && now.getMonth() === birthTime.getMonth();
};
export const getLifeProgress = () => {
  const raycastTheme = environment.theme;
  const lifeProgresses: LifeProgress[] = [];
  const { iconTheme } = preferences();

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

  lifeProgresses.push({
    section: SectionTitle.YOU_HAVE,
    icon: meaningfulDaysIcon(getSpendDays()),
    title: `Spent ${getSpendDays()} meaningful days`,
    number: getSpendDays(),
    accessUnit: getNumberCanvas(_iconTheme, getSpendDays()),
  });
  lifeProgresses.push({
    section: SectionTitle.YOU_HAVE,
    icon: "🎊",
    title: `Celebrated ${getSpendYears()} New Year's Days`,
    number: getSpendYears(),
    accessUnit: getNumberCanvas(_iconTheme, getSpendYears()),
  });
  lifeProgresses.push({
    section: SectionTitle.YOU_HAVE,
    icon: getSpendCentury() == 1 ? "✈️" : "🚀",
    title: `Witnessed ${getSpendCentury()} great centuries`,
    number: getSpendCentury(),
    accessUnit: getNumberCanvas(_iconTheme, getSpendCentury()),
  });

  lifeProgresses.push({
    section: SectionTitle.YOU_MAY_BE_ABLE_TO,
    icon: "💰",
    title: `Receive ${getLeftPaychecks()} generous paychecks`,
    number: getLeftPaychecks(),
    accessUnit: getNumberCanvas(_iconTheme, getLeftPaychecks()),
  });
  lifeProgresses.push({
    section: SectionTitle.YOU_MAY_BE_ABLE_TO,
    icon: "🎡",
    title: `Spend ${getLeftWeeks()} pleasant weekends`,
    number: getLeftWeeks(),
    accessUnit: getNumberCanvas(_iconTheme, getLeftWeeks()),
  });
  lifeProgresses.push({
    section: SectionTitle.YOU_MAY_BE_ABLE_TO,
    icon: "🌙",
    title: `Enjoy ${getLeftNights()} wonderful nights`,
    number: getLeftNights(),
    accessUnit: getNumberCanvas(_iconTheme, getLeftNights()),
  });

  lifeProgresses.push({
    section: SectionTitle.TIME_LEFT,
    icon: timeIcon24[getHourLeftThisDay()],
    title: `${getHourLeftThisDay()} hours left in the day`,
    number: getHourLeftThisDay(),
    accessUnit: getNumberCanvas(_iconTheme, getHourLeftThisDay()),
  });
  lifeProgresses.push({
    section: SectionTitle.TIME_LEFT,
    icon: getDaysLeftThisWeek() <= 1 ? "🏝" : "💼",
    title: `${getDaysLeftThisWeek()} days left in the week`,
    number: getDaysLeftThisWeek(),
    accessUnit: getNumberCanvas(_iconTheme, getDaysLeftThisWeek()),
  });
  lifeProgresses.push({
    section: SectionTitle.TIME_LEFT,
    icon: getDaysLeftThisMonth() < 15 ? "⌛️" : "⏳",
    title: `${getDaysLeftThisMonth()} days left in the month`,
    number: getDaysLeftThisMonth(),
    accessUnit: getNumberCanvas(_iconTheme, getDaysLeftThisMonth()),
  });
  lifeProgresses.push({
    section: SectionTitle.TIME_LEFT,
    icon: getDaysLeftThisYear() < 182 ? "🎇" : "🎆",
    title: `${getDaysLeftThisYear()} days left in the year`,
    number: getDaysLeftThisYear(),
    accessUnit: getNumberCanvas(_iconTheme, getDaysLeftThisYear()),
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

const numberPathList = (theme: string) => {
  return [
    { value: "0", path: `${theme}/0.png` },
    { value: "1", path: `${theme}/1.png` },
    { value: "2", path: `${theme}/2.png` },
    { value: "3", path: `${theme}/3.png` },
    { value: "4", path: `${theme}/4.png` },
    { value: "5", path: `${theme}/5.png` },
    { value: "6", path: `${theme}/6.png` },
    { value: "7", path: `${theme}/7.png` },
    { value: "8", path: `${theme}/8.png` },
    { value: "9", path: `${theme}/9.png` },
  ];
};
export const allTheme = ["bird", "pixel", "simple", "rainbow"];

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

export enum SectionTitle {
  ALL_LIFE_PROGRESS = "All life progress",
  YOU_HAVE = "You have",
  YOU_MAY_BE_ABLE_TO = "You may be able to",
  TIME_LEFT = "Time Left",
}

export const timeLeftFirstList = [SectionTitle.TIME_LEFT, SectionTitle.YOU_HAVE, SectionTitle.YOU_MAY_BE_ABLE_TO];
export const timeLeftLastList = [SectionTitle.YOU_HAVE, SectionTitle.YOU_MAY_BE_ABLE_TO, SectionTitle.TIME_LEFT];

export const tagsTimeLeftFirst = [SectionTitle.ALL_LIFE_PROGRESS].concat(timeLeftFirstList);

export const tagsTimeLeftLast = [SectionTitle.ALL_LIFE_PROGRESS].concat(timeLeftLastList);
