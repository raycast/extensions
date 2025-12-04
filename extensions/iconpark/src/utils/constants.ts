import { IIconConfig } from "@icon-park/svg/lib/runtime";
import { homedir } from "os";

export const iconParkCategory = [
  "All",
  "Abstract",
  "Animals",
  "Arrows",
  "Base",
  "Books",
  "Brand",
  "Build",
  "Character",
  "Charts",
  "Child",
  "Clothes",
  "Communicate",
  "Components",
  "Connect",
  "Constellation",
  "Datas",
  "Edit",
  "Emoji",
  "Energy",
  "Foods",
  "Graphics",
  "Hands",
  "Hardware",
  "Health",
  "Industry",
  "Life",
  "Makeups",
  "Money",
  "Music",
  "Office",
  "Operate",
  "Peoples",
  "Sports",
  "Time",
  "Travel",
  "Weather",
  "Others",
];

export enum LocalStorageKey {
  ICON_CONFIG = "Icon Config",
}

export const filePath = homedir() + "/Downloads";

export const configDefault: IIconConfig = {
  theme: "outline",
  size: "12em",
  strokeWidth: 3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  prefix: "1",
  colors: {
    outline: {
      fill: "#333",
      background: "#fff",
    },
    filled: {
      fill: "#85B5FF",
      background: "#fff",
    },
    twoTone: {
      fill: "#086CFF",
      twoTone: "#85B5FF",
    },
    multiColor: {
      outStrokeColor: "#4230DA",
      outFillColor: "#fff",
      innerStrokeColor: "#FF5675",
      innerFillColor: "#FF5675",
    },
  },
};

export const iconBaseDefault = {
  size: configDefault.size,
  strokeWidth: configDefault.strokeWidth,
  strokeLinecap: configDefault.strokeLinecap,
  strokeLinejoin: configDefault.strokeLinejoin,
  theme: configDefault.theme,
  fill: configDefault.colors.outline.fill,
};

export const configTheme = [
  { title: "Outline", value: "outline" },
  { title: "Filled", value: "filled" },
  { title: "Two Tone", value: "two-tone" },
  { title: "Multi color", value: "multi-color" },
];
export const configSize = () => {
  let i = 12;
  const _configSize = [];
  while (i <= 48) {
    _configSize.push({ title: i + "", value: i + "em" });
    i++;
  }
  return _configSize;
};

export const strokeLineCap = [
  { title: "Butt", value: "butt" },
  { title: "Round", value: "round" },
  { title: "Square", value: "square" },
];
export const strokeLineJoin = [
  { title: "Miter", value: "miter" },
  { title: "Round", value: "round" },
  { title: "Bevel", value: "bevel" },
];
export const strokeWidth = [
  { title: "1", value: 1 },
  { title: "2", value: 2 },
  { title: "3", value: 3 },
  { title: "4", value: 4 },
];
