import { homedir } from "os";

const homePath = homedir();
const friendlyNames = new Map<string, string>([
  [`${homePath}/Library/Mobile Documents/com~apple~CloudDocs`, "iCloud Drive"],
  [homePath, "~"],
]);
const reversedFriendlyNames = new Map<string, string>(Array.from(friendlyNames).map(([key, value]) => [value, key]));

export const makeFriendly = (path: string): string => {
  if (path === homePath) return path; // Don't replace root home path
  return Array.from(friendlyNames).reduce((out: string, [key, value]): string => {
    return out.replace(key, value);
  }, path);
};

export const makeUnfriendly = (path: string): string => {
  return Array.from(reversedFriendlyNames).reduce((out: string, [key, value]): string => {
    return out.replace(key, value);
  }, path);
};

export const base64Encode = (path: string): string => {
  const bytes = new TextEncoder().encode(path);
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
  return btoa(binString).replace(/=+$/, "");
};
