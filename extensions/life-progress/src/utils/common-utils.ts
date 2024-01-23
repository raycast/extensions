import { commandMetadata, progressSymbol } from "../types/preferences";
import { LifeProgress } from "../types/types";
import { updateCommandMetadata } from "@raycast/api";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

const getCanvasSymbols = (titleProgressBar = false) => {
  let spentSymbol = "■";
  let leftSymbol = "□";
  let symbolNum = 40;
  switch (progressSymbol) {
    case "■": {
      spentSymbol = "■";
      leftSymbol = "□";
      symbolNum = titleProgressBar ? 52 : symbolNum;
      break;
    }
    case "●": {
      spentSymbol = "●";
      leftSymbol = "○";
      symbolNum = titleProgressBar ? 52 : symbolNum;
      break;
    }
    case "♥︎": {
      spentSymbol = "♥︎︎";
      leftSymbol = "♡";
      symbolNum = titleProgressBar ? 47 : symbolNum;
      break;
    }
    case "✿": {
      spentSymbol = "✿︎";
      leftSymbol = "❀";
      symbolNum = titleProgressBar ? 59 : symbolNum;
      break;
    }
    case "★": {
      spentSymbol = "★";
      leftSymbol = "☆";
      symbolNum = titleProgressBar ? 46 : symbolNum;
      break;
    }
    case "✪": {
      spentSymbol = "✪";
      leftSymbol = "○";
      symbolNum = titleProgressBar ? 55 : symbolNum;
      break;
    }
    case "✔": {
      spentSymbol = "✔︎";
      leftSymbol = "✘";
      symbolNum = titleProgressBar ? 66 : symbolNum;
      break;
    }
    case "⚉": {
      spentSymbol = "⚉";
      leftSymbol = "⚇";
      symbolNum = titleProgressBar ? 80 : symbolNum;
      break;
    }
    case "☀︎": {
      spentSymbol = "☀︎";
      leftSymbol = "☼";
      symbolNum = titleProgressBar ? 45 : symbolNum;
      break;
    }
    case "❄︎": {
      spentSymbol = "❄︎︎︎︎";
      leftSymbol = "☃︎";
      symbolNum = titleProgressBar ? 48 : symbolNum;
      break;
    }
    default:
      break;
  }
  return { spentSymbol: spentSymbol, leftSymbol: leftSymbol, titleSymbolNum: symbolNum };
};

export const getLiftProgressCanvas = (
  spentTime: number,
  leftTime: number,
  symbolNum: number,
  titleProgressBar = false,
) => {
  const { spentSymbol, leftSymbol, titleSymbolNum } = getCanvasSymbols(titleProgressBar);
  const finalSymbolNum = titleProgressBar ? titleSymbolNum : symbolNum;

  const canvas =
    spentSymbol.repeat(Math.floor((spentTime / (spentTime + leftTime)) * finalSymbolNum)) +
    leftSymbol.repeat(finalSymbolNum - Math.floor((spentTime / (spentTime + leftTime)) * finalSymbolNum));
  const text = ((spentTime / (spentTime + leftTime)) * 100).toFixed(0) + "%";
  return { canvas: canvas, text: text };
};

export const getCountdownCanvas = (spentTime: number, leftTime: number, symbolNum: number) => {
  const { spentSymbol, leftSymbol } = getCanvasSymbols();

  const canvas =
    spentSymbol.repeat(Math.floor((spentTime / (spentTime + leftTime)) * symbolNum)) +
    leftSymbol.repeat(symbolNum - Math.floor((spentTime / (spentTime + leftTime)) * symbolNum));
  const text = ((spentTime / (spentTime + leftTime)) * 100).toFixed(0) + "%";
  return { canvas: canvas, text: text };
};

export const updateCommandSubtitle = async (lifeProgresses: LifeProgress[]) => {
  let subtitleStrSpent = 0;
  let subtitleStrAll = "";
  let subtitleIcon = "";
  const subtitleUnit = commandMetadata;

  switch (commandMetadata) {
    case "Day": {
      subtitleStrSpent = 24 - lifeProgresses[6].number - 1;
      subtitleIcon = getLiftProgressCanvas(subtitleStrSpent, lifeProgresses[6].number, 24, false).canvas;
      subtitleStrAll = "24";
      break;
    }
    case "Week": {
      subtitleStrSpent = 7 - lifeProgresses[7].number - 1;
      subtitleIcon = getLiftProgressCanvas(subtitleStrSpent, lifeProgresses[7].number, 7, false).canvas;
      subtitleStrAll = "7";
      break;
    }
    case "Month": {
      const days = daysInCurrentMonth();
      subtitleStrSpent = days - lifeProgresses[8].number;
      subtitleIcon = getLiftProgressCanvas(subtitleStrSpent, lifeProgresses[8].number, days, false).canvas;
      subtitleStrAll = days.toString();
      break;
    }
    case "Year": {
      const years = daysInCurrentYear();
      subtitleStrSpent = years - lifeProgresses[9].number;
      subtitleIcon = getLiftProgressCanvas(subtitleStrSpent, lifeProgresses[9].number, 24, false).canvas;
      subtitleStrAll = years.toString();
      break;
    }
  }
  await updateCommandMetadata({
    subtitle: subtitleIcon + "  " + subtitleStrSpent + "/" + subtitleStrAll + " " + subtitleUnit,
  });
};

const daysInCurrentMonth = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const firstDayOfNextMonth = new Date(currentYear, currentMonth + 1, 1);
  const lastDayOfCurrentMonth = new Date(firstDayOfNextMonth.getTime() - 24 * 60 * 60 * 1000);
  return lastDayOfCurrentMonth.getDate();
};

const isLeapYear = (year: number) => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

const daysInCurrentYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  return isLeapYear(currentYear) ? 366 : 365;
};
