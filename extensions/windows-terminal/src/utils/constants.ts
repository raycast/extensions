import { getPreferenceValues } from "@raycast/api";

const localAppData = `${process.env.HOME}/AppData/Local`;
const { windowsTerminalPath } = getPreferenceValues<Preferences>()
const isSystem = typeof windowsTerminalPath !== "string" || windowsTerminalPath.trim() === ""

const systemProfilesPath = `${localAppData}/Packages/Microsoft.WindowsTerminal_8wekyb3d8bbwe/LocalState/settings.json`;
const sytemWtPath = `${localAppData}/Microsoft/WindowsApps/Microsoft.WindowsTerminal_8wekyb3d8bbwe/wt.exe`;

const portableProfilesPath = `${localAppData}/Microsoft/Windows Terminal/settings.json`
const portbaleWtPath = `${windowsTerminalPath}/wt.exe`

export const profilesPath = isSystem ? systemProfilesPath : portableProfilesPath
export const wtPath = isSystem ? sytemWtPath : portbaleWtPath