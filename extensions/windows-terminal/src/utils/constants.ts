import os from "node:os";

const localAppdata = `C:/Users/${os.userInfo().username}/AppData/Local`;

export const profilesPath = `${localAppdata}/Packages/Microsoft.WindowsTerminal_8wekyb3d8bbwe/LocalState/settings.json`;
export const wtPath = `${localAppdata}/Microsoft/WindowsApps/Microsoft.WindowsTerminal_8wekyb3d8bbwe/wt.exe`;
