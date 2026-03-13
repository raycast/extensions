import { getPlatform } from "web3bio-profile-kit/utils";
import { Platform } from "web3bio-profile-kit/types";

export const formatText = (string: string, length?: number) => {
  if (!string) return "";
  const len = length ?? 12;
  if (string.length <= len) {
    return string;
  }
  if (string.startsWith("0x") || string.length >= 42) {
    const oriAddr = string,
      chars = length || 4;
    return `${oriAddr.substring(0, chars + 2)}...${oriAddr.substring(oriAddr.length - chars)}`;
  } else {
    if (string.length > len) {
      return `${string.substr(0, len)}...`;
    }
  }
  return string;
};

const resolveSocialMediaLink = (name: string, type: Platform) => {
  if (!Object.keys(Platform).includes(type)) return `https://web3.bio/?s=${name}`;
  switch (type) {
    case Platform.url:
      return `${name}`;
    case Platform.dns:
    case Platform.website:
      return `https://${name}`;
    case Platform.discord:
      if (name.includes("https://")) return getPlatform(type).urlPrefix + name;
      return "";
    default:
      return getPlatform(type).urlPrefix ? getPlatform(type).urlPrefix + name : name;
  }
};

export const getSocialMediaLink = (url: string, type: Platform) => {
  let resolvedURL = "";
  if (!url) return null;
  if (url.startsWith("https")) {
    resolvedURL = url;
  } else {
    resolvedURL = resolveSocialMediaLink(url, type);
  }

  return resolvedURL;
};

export const fallbackEmoji = ["🤔", "😱", "😵‍💫", "😵", "🤦‍♀️", "💆‍♂️", "🤷‍♂️", "🙇‍♂️", "🤖"];
