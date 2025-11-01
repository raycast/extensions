import { Color, Icon } from "@raycast/api";
import { Area } from "./types";

const getUrl = (url: string) => {
  return `https://lavinprognoser.se/${url}`;
};

const getAreaSlug = (url: string) => {
  const urlParts = url.split("/");
  return urlParts[urlParts.length - 2];
};

const getRiskLevel = (area: Area) => {
  const match = area.riskImage.src.match(/risk-(\d+)\.svg/);
  return match ? match[1] : "0";
};

const riskLevelToColor = (riskLevel: string) => {
  switch (riskLevel) {
    case "1":
      return Color.Green;
    case "2":
      return Color.Yellow;
    case "3":
      return Color.Orange;
    case "4":
      return Color.Red;
    case "5":
      return Color.Purple;
    default:
      return Color.SecondaryText;
  }
};

const riskLevelToIcon = (riskLevel: string) => {
  switch (riskLevel) {
    case "1":
      return Icon.Number01;
    case "2":
      return Icon.Number02;
    case "3":
      return Icon.Number03;
    case "4":
      return Icon.Number04;
    case "5":
      return Icon.Number05;
    default:
      return Icon.Number00;
  }
};

export { riskLevelToColor, getRiskLevel, getUrl, riskLevelToIcon, getAreaSlug };
