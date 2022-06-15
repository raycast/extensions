import { environment } from "@raycast/api";
import { HistoryScore } from "../types/types";

const assetPath = environment.assetsPath;

export const numberPathList = (theme: string) => {
  return [
    { value: "0", path: `${assetPath}/${theme}/0.png` },
    { value: "1", path: `${assetPath}/${theme}/1.png` },
    { value: "2", path: `${assetPath}/${theme}/2.png` },
    { value: "3", path: `${assetPath}/${theme}/3.png` },
    { value: "4", path: `${assetPath}/${theme}/4.png` },
    { value: "5", path: `${assetPath}/${theme}/5.png` },
    { value: "6", path: `${assetPath}/${theme}/6.png` },
    { value: "7", path: `${assetPath}/${theme}/7.png` },
    { value: "8", path: `${assetPath}/${theme}/8.png` },
    { value: "9", path: `${assetPath}/${theme}/9.png` },
  ];
};

export const ICON_COUNT = 32;
export const ALL_COUNTDOWN_TIME = 30;

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
