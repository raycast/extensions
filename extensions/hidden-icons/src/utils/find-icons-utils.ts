import { easyIcon, hardIcon, hellIcon, mediumIcon } from "./icon-utils";
import { LocalStorage } from "@raycast/api";

const columnCount = 39;
const rowCount = 9;
export const allCountDownTime = 30;

export type HistoryScore = {
  mode: string;
  score: number;
};

export const historyScoreInit: HistoryScore[] = [
  { mode: "Easy", score: 0 },
  { mode: "Medium", score: 0 },
  { mode: "Hard", score: 0 },
  { mode: "Hell", score: 0 },
];

export const modes = [
  { title: "Easy", value: "Easy" },
  { title: "Medium", value: "Medium" },
  { title: "Hard", value: "Hard" },
  { title: "Hell", value: "Hell" },
];

const getTwoRandoms = (length: number) => {
  const randoms: number[] = [];
  while (randoms.length < 2) {
    const random = Math.floor(Math.random() * length);
    if (!randoms.includes(random)) {
      randoms.push(random);
    }
  }
  return randoms;
};

const getIcons = (mode: string) => {
  switch (mode) {
    case "Easy": {
      //easy
      const randomWhichIndex = Math.floor(Math.random() * easyIcon.length);
      const randoms = getTwoRandoms(easyIcon[randomWhichIndex].length);
      return {
        contextIcon: easyIcon[randomWhichIndex][randoms[0]],
        targetIcon: easyIcon[randomWhichIndex][randoms[1]],
      };
    }
    case "Medium": {
      //medium
      const randomWhichIndex = Math.floor(Math.random() * mediumIcon.length);
      const randoms = getTwoRandoms(mediumIcon[randomWhichIndex].length);
      return {
        contextIcon: mediumIcon[randomWhichIndex][randoms[0]],
        targetIcon: mediumIcon[randomWhichIndex][randoms[1]],
      };
    }
    case "Hard": {
      //hard
      const randomWhichIndex = Math.floor(Math.random() * hardIcon.length);
      const randoms = getTwoRandoms(hardIcon[randomWhichIndex].length);
      return {
        contextIcon: hardIcon[randomWhichIndex][randoms[0]],
        targetIcon: hardIcon[randomWhichIndex][randoms[1]],
      };
    }
    case "Hell": {
      //hell
      const randomWhichIndex = Math.floor(Math.random() * hellIcon.length);
      const randoms = getTwoRandoms(hellIcon[randomWhichIndex].length);
      return {
        contextIcon: hellIcon[randomWhichIndex][randoms[0]],
        targetIcon: hellIcon[randomWhichIndex][randoms[1]],
      };
    }
    default: {
      //easy
      const randomWhichIndex = Math.floor(Math.random() * easyIcon.length);
      const randoms = getTwoRandoms(easyIcon[randomWhichIndex].length);
      return {
        contextIcon: easyIcon[randomWhichIndex][randoms[0]],
        targetIcon: easyIcon[randomWhichIndex][randoms[1]],
      };
    }
  }
};
export const getRandomFindOutIcon = (lastRandomRaw: number, mode: string) => {
  const _findOutIcons: string[][] = [];
  const { contextIcon, targetIcon } = getIcons(mode);

  let randomRaw = Math.floor(Math.random() * rowCount);

  while (randomRaw === lastRandomRaw) {
    randomRaw = Math.floor(Math.random() * rowCount);
  }
  const randomColum = Math.floor(Math.random() * columnCount);

  for (let i = 0; i < rowCount; i++) {
    const arr = [];
    for (let j = 0; j < columnCount; j++) {
      arr.push(contextIcon);
    }
    _findOutIcons.push(arr);
  }
  _findOutIcons[randomRaw][randomColum] = targetIcon;
  const findOutIcons: string[] = [];
  for (let i = 0; i < _findOutIcons.length; i++) {
    findOutIcons.push(_findOutIcons[i].join(""));
  }

  return { targetIcon: targetIcon, targetIndex: randomRaw, randomFindOutIcons: findOutIcons };
};

export const getHistoryScore = async () => {
  const _localStorage = await LocalStorage.getItem("HistoryScore");
  const historyScore: HistoryScore[] = typeof _localStorage === "string" ? JSON.parse(_localStorage) : historyScoreInit;
  return historyScore;
};
