import { runAppleScript } from "run-applescript";

const scriptChooseFile = `
if application "Finder" is not running then
    return "Not running"
end if

return POSIX path of (choose file)
`;

export const chooseFile = async () => {
  let finderPath = "";
  try {
    finderPath = await runAppleScript(scriptChooseFile);
  } catch (e) {
    console.error(String(e));
  }
  return finderPath;
};

const scriptCopyFile = (path: string) => {
  return `tell app "Finder" to set the clipboard to (POSIX file "${path}")`;
};

export const copyFileByPath = async (path: string) => {
  try {
    await runAppleScript(scriptCopyFile(path));
    return "";
  } catch (e) {
    return String(e);
  }
};
