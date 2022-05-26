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

const scriptReadClipboard = `
if application "Finder" is not running then
    return "Not running"
end if

return the clipboard
`;

export const readClipboard = async () => {
  let content = "";
  try {
    content = await runAppleScript(scriptReadClipboard);
  } catch (e) {
    console.error(String(e));
  }
  return content;
};
