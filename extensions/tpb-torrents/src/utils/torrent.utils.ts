import { Icon } from "@raycast/api";
import { CATEGORY_ICONS, FILE_SIZE_UNITS } from "../constants/api.constants";

export const formatFileSize = (bytes: number): string => {
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < FILE_SIZE_UNITS.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${FILE_SIZE_UNITS[unitIndex]}`;
};

export const formatDate = (timestamp: string): string => {
  return new Date(parseInt(timestamp) * 1000).toLocaleDateString();
};

export const getCategoryIcon = (category: string): Icon => {
  const categoryPrefix = category.charAt(0) + "00";
  const iconName = CATEGORY_ICONS[categoryPrefix as keyof typeof CATEGORY_ICONS];
  return Icon[iconName as keyof typeof Icon] || Icon.Document;
};

export const generateMagnetLink = (infoHash: string, name: string): string => {
  return `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(name)}`;
};

export const hasContent = (value: string | number | null | undefined): boolean => {
  if (value === null || value === undefined) return false;
  const stringValue = String(value).trim();
  return stringValue.length > 0;
};

export const hasTextContent = (value: string | number | null | undefined): boolean => {
  if (value === null || value === undefined) return false;
  const stringValue = String(value).trim();
  return stringValue.length > 0 && stringValue !== "0" && stringValue !== "undefined" && stringValue !== "null";
};
