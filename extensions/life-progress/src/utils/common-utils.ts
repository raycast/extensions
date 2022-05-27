import { progressSymbol } from "../types/preferences";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const getLiftProgressCanvas = (
  spentTime: number,
  leftTime: number,
  symbolNum: number,
  titleProgressBar = false
) => {
  //■□
  //★☆
  //✪✫
  let spentSymbol = "■";
  let leftSymbol = "□";
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

  const canvas =
    spentSymbol.repeat(Math.floor((spentTime / (spentTime + leftTime)) * symbolNum)) +
    leftSymbol.repeat(symbolNum - Math.floor((spentTime / (spentTime + leftTime)) * symbolNum));
  const text = ((spentTime / (spentTime + leftTime)) * 100).toFixed(0) + "%";
  return { canvas: canvas, text: text };
};
