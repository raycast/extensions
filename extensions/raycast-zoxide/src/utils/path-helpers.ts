import { getPreferenceValues } from "@raycast/api";
import { homedir } from "os";
import path from "path";

const homePath = homedir();
const { "addl-paths": addlPaths } = getPreferenceValues<{ "addl-paths": string | undefined }>();
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

export const defaultPathFor = (command: string): string => {
  switch (command) {
    case "spotlight":
      return "/usr/bin";
    default:
      return "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin";
  }
};

export const pathFor = (command: string): string => {
  const defaultPath = defaultPathFor(command);
  if (!addlPaths?.trim()) return defaultPath; // If no additional paths, return default

  const cleanPaths = addlPaths
    .split(path.delimiter) // Use system delimiter (: on Unix, ; on Windows)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => (p.startsWith("~/") ? p.replace("~", homePath || "~") : p))
    .map((p) => path.normalize(p))
    .join(path.delimiter);

  return [cleanPaths, defaultPath].join(path.delimiter);
};
