import { PlatformType, PlatformData } from "./platform";
import {
  regexDotbit,
  regexEns,
  regexEth,
  regexLens,
  regexTwitter,
  regexUnstoppableDomains,
  regexSpaceid,
  regexFarcaster,
} from "./regexp";

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

export const handleSearchPlatform = (term: string) => {
  switch (true) {
    case regexEns.test(term):
      return PlatformType.ens;
    case regexEth.test(term):
      return PlatformType.ethereum;
    case regexLens.test(term):
      return PlatformType.lens;
    case regexUnstoppableDomains.test(term):
      return PlatformType.unstoppableDomains;
    case regexSpaceid.test(term):
      return PlatformType.space_id;
    case regexDotbit.test(term):
      return PlatformType.dotbit;
    case regexTwitter.test(term):
      return PlatformType.twitter;
    case regexFarcaster.test(term):
      return PlatformType.farcaster;
    default:
      return PlatformType.nextid;
  }
};

export const isDomainSearch = (term: PlatformType) => {
  return [PlatformType.ens, PlatformType.dotbit, PlatformType.unstoppableDomains, PlatformType.space_id].includes(term);
};

export const SocialPlatformMapping = (platform: PlatformType) => {
  return (
    PlatformData[platform] ?? {
      key: platform,
      color: "#000000",
      icon: "",
      label: platform,
      ensText: [],
    }
  );
};

const resolveSocialMediaLink = (name: string, type: PlatformType) => {
  if (!Object.keys(PlatformType).includes(type)) return `https://web3.bio/?s=${name}`;
  switch (type) {
    case PlatformType.url:
      return `${name}`;
    case PlatformType.website:
      return `https://${name}`;
    default:
      return SocialPlatformMapping(type).urlPrefix ? SocialPlatformMapping(type).urlPrefix + name : "";
  }
};

export const getSocialMediaLink = (url: string, type: PlatformType) => {
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
