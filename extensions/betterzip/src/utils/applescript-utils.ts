import { runAppleScript } from "run-applescript";

export const scriptArchiveFiles = async (filePaths: string[]) => {
  try {
    const _filePaths = filePaths.map((value) => `"${value}"`);
    const script = `tell application "BetterZip"
    set someFiles to {${_filePaths.join(",")}}
    archive someFiles with options {destination:original, format:sevenzip, compression level:fast}
end tell`;
    await runAppleScript(script);
  } catch (e) {
    console.error(String(e));
  }
};

export const scriptExtractArchives = async (filePaths: string[]) => {
  try {
    const _filePaths = filePaths.map((value) => `"${value}"`);
    const script = `tell application "BetterZip"
    set archFiles to {${_filePaths.join(",")}}
    unarchive archFiles with options {destination:original}
end tell`;
    await runAppleScript(script);
  } catch (e) {
    console.error(String(e));
  }
};

export const scriptTestArchives = async (filePaths: string[]) => {
  try {
    const _filePaths = filePaths.map((value) => `"${value}"`);
    const script = `tell application "BetterZip"
    set archFiles to {${_filePaths.join(",")}}
    test archFiles
end tell`;
    await runAppleScript(script);
  } catch (e) {
    console.error(String(e));
  }
};
