import { getTabJavascript } from "./get-tab-javascript";
import { ComposeAppleScriptArguments, TabOpenerArguments } from "./types";

function runJS(browserName: TabOpenerArguments["browserName"], code: string): string {
  if (browserName === "Safari") {
    return `do javascript "${code}"`;
  } else {
    return `execute javascript "${code}"`;
  }
}

export function composeApplescript({
  browserName,
  prompt,
  urlToSearch,
  urlToOpen,
}: ComposeAppleScriptArguments): string {
  const tabJavascript = getTabJavascript(prompt);
  return `
on run
    set urlExists to false
    set urlToSearch to "${urlToSearch}"
    set urlToUse to "${urlToOpen}"
    tell application "${browserName}"
        repeat with w in (every window)
            repeat with t in (every tab of w)
                if URL of t starts with urlToSearch then
                    set urlExists to true
                    exit repeat
                end if
            end repeat
            if urlExists then
                set urlToUse to "${urlToSearch}"
                exit repeat
            end if
        end repeat
        if not urlExists then
            open location urlToUse
            delay 2
        end if
    end tell

    tell application "${browserName}"
      repeat with w in (every window)
          repeat with t in (every tab of w)
            if URL of t starts with urlToUse then
                tell t
                  ${runJS(browserName, tabJavascript)}
                  return urlToUse
                end tell
                exit repeat
            end if
          end repeat
      end repeat
    end tell
end run
    `;
}
