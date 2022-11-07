import { runAppleScriptSilently } from "./services/utils";

export default async () => {
  await runAppleScriptSilently(initCliDemoScript);
};

const initCliDemoScript = `
    tell application "Terminal"
      activate
      do script ("npx novu init")
    end tell  
  `;
