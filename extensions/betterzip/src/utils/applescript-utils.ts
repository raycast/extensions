import { runAppleScript } from "run-applescript";

export const scriptArchiveFiles = async (filePaths: string[]) => {
  try {
    const _filePaths = filePaths.map((value) => `"${value}"`);
    const script = `tell application "BetterZip"
    set someFiles to {${_filePaths.join(",")}}  
    queued archive someFiles with options {destination:original, format:zip, compression level:normal} show ui true
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
    queued unarchive archFiles with options {destination:original} show ui true
end tell`;
    await runAppleScript(script);
  } catch (e) {
    console.error(String(e));
  }
};
