import { UnrestrictLinkResponse } from "../schema";

export const formatProgress = (progress: number) => {
  if (!progress) return "Unknown";
  if (progress === 100) return "Completed";

  return `${progress}%`;
};

export const isUnrestrictedTorrent = (response: UnrestrictLinkResponse) => {
  return Boolean(response?.id && response?.uri);
};

export const isUnrestrictedHosterLink = (response: UnrestrictLinkResponse) => {
  return Boolean(response?.id && response?.host);
};
