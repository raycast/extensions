import { runAppleScript } from "run-applescript";

export const scriptCompressFiles = async (filePaths: string[]) => {
  scriptExecuteFiles("compress", filePaths);
};

export const scriptExtractFiles = async (filePaths: string[]) => {
  scriptExecuteFiles("extract", filePaths);
};

export const scriptSendFiles = async (filePaths: string[]) => {
  scriptExecuteFiles("send", filePaths);
};

export const scriptExecuteFiles = async (
  action: string,
  filePaths: string[],
) => {
  try {
    const appleScriptFileList = filePaths
      .map((path) => `POSIX file "${path}"`)
      .join(", ");

    const script = `
		tell application id "com.aone.keka"
		${action} {${appleScriptFileList}}
		end tell
		`;

    await runAppleScript(script);
  } catch (e) {
    console.error(String(e));
  }
};
