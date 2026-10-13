import { getPreferenceValues } from "@raycast/api";
import fs from "fs";

const localAppData = `${process.env.HOME}/AppData/Local`;
const { windowsTerminalPath } = getPreferenceValues<Preferences>();

const systemProfilesPath = `${localAppData}/Packages/Microsoft.WindowsTerminal_8wekyb3d8bbwe/LocalState/settings.json`;
const systemWtPath = `${localAppData}/Microsoft/WindowsApps/Microsoft.WindowsTerminal_8wekyb3d8bbwe/wt.exe`;

const portableProfilesPath = `${windowsTerminalPath}/settings/settings.json`;
const portableWtPath = `${windowsTerminalPath}/wt.exe`;

const otherProfilesPath = `${localAppData}/Microsoft/Windows Terminal/settings.json`;

const isSystem = typeof windowsTerminalPath !== "string" || windowsTerminalPath.trim() === "";
const isPortable = fs.existsSync(`${windowsTerminalPath}/.portable`);
const shouldUseAlias = !isPortable && !fs.existsSync(systemWtPath);

export const isIncorrectPortableConfig = isPortable && !fs.existsSync(portableProfilesPath);

export const profilesPath = isSystem
  ? systemProfilesPath
  : isPortable
    ? isIncorrectPortableConfig
      ? otherProfilesPath
      : portableProfilesPath
    : otherProfilesPath;
export const wtPath = isSystem ? (shouldUseAlias ? "wt.exe" : systemWtPath) : portableWtPath;
