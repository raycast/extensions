import { progressSymbol } from "../types/preferences";

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
  titleProgressBar = false
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
