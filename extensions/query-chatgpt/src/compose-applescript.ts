import { randomUUID } from "node:crypto";

import { getTabJavascript } from "./get-tab-javascript";
import { ComposeAppleScriptArguments, TabOpenerArguments } from "./types";

function runJS(browserName: TabOpenerArguments["browserName"], code: string): string {
  if (browserName === "Safari") {
    return `do javascript "${code}"`;
  } else {
    return `execute javascript "${code}"`;
  }
}

function composeUrlWithRandomId(gptUrl: TabOpenerArguments["gptUrl"]): string {
  const id = randomUUID();

  const url = new URL(gptUrl);
  url.searchParams.set("_qchat-id", id);

  return url.toString();
}

export function composeApplescript({ browserName, prompt, gptUrl }: ComposeAppleScriptArguments): string {
  const completeUrl = composeUrlWithRandomId(gptUrl);
  const tabJavascript = getTabJavascript(prompt);
  return `
tell application "${browserName}"
    open location "${completeUrl}"
end tell

delay 2

tell application "${browserName}"
    repeat with w in (every window)		
        repeat with t in (every tab whose URL equal "${completeUrl}") of w
          tell t
            return ${runJS(browserName, tabJavascript)}
          end tell
        end repeat	
    end repeat
end tell
    `;
}
