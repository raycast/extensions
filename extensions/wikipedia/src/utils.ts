import { runAppleScript } from "run-applescript";

export const openInBrowser = async (url: string) => {
  await runAppleScript(`open location "${url}"`);
};
