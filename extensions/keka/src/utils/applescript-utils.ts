import { showFailureToast, runAppleScript } from "@raycast/utils";

export const scriptCompressFiles = (filePaths: string[]) => {
  return scriptExecuteFiles("compress", filePaths);
};

export const scriptExtractFiles = (filePaths: string[]) => {
  return scriptExecuteFiles("extract", filePaths);
};

export const scriptSendFiles = (filePaths: string[]) => {
  return scriptExecuteFiles("send", filePaths);
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
    await showFailureToast(e, {
      title: e instanceof Error ? e.toString() : "Failed to execute",
    });
  }
};
