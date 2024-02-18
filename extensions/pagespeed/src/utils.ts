import { getProgressIcon, getFavicon as getF } from "@raycast/utils";
import { Color, Image, Icon } from "@raycast/api";

export const getFavicon = (url: string) => {
  const u = "https://" + url;
  return getF(u, {
    mask: Image.Mask.RoundedRectangle,
    fallback: Icon.Globe,
  });
};

export const getIcon = (score: number) => {
  // float to int
  const intScore = Math.floor(score);
  const circle = Math.round(intScore / 10) / 10;
  return getProgressIcon(circle, getColor(score));
};

export const getColor = (score: number) => {
  if (!score) return Color.SecondaryText;
  if (score >= 90) return Color.Green;
  if (score >= 50) return Color.Yellow;
  return Color.Red;
};

const domainAndUrlRegEx = /^(((http|https):\/\/|)?[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,6}(:[0-9]{1,5})?(\/.*)?)$/;

export const isURL = (url: string) => {
  if (!url) return false;
  return domainAndUrlRegEx.test(url);
};

export const round = (num: number, places: number = 1) => {
  return +(Math.round(Number(num + "e+" + places)) + "e-" + places);
};

export const stripProtocol = (url: string) => {
  const stripped = url.replace(/(^\w+:|^)\/\//, "");
  // remove trailing slash
  const without = stripped.replace(/\/$/, "");
  return without;
};
