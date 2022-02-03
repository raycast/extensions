import { runAppleScript } from "run-applescript";
import { Tab } from "../lib/Tab";

export async function getOpenTabs(useOriginalFavicon: boolean): Promise<Tab[]> {
  const faviconFormula = useOriginalFavicon
    ? `execute of tab _tab_index of window _window_index javascript ¬
                      "document.querySelector('link[rel~=icon]').href;"`
    : '""';

  const openTabs = await runAppleScript(`
        set _output to ""
        tell application "Microsoft Edge"
          set _window_index to 1
          repeat with w in windows
            set _tab_index to 1
            repeat with t in tabs of w
              set _title to get title of t
              set _url to get URL of t
              set _favicon to ${faviconFormula}
              set _output to (_output & _title & "${Tab.TAB_CONTENTS_SEPARATOR}" & _url & "${Tab.TAB_CONTENTS_SEPARATOR}" & _favicon & "${Tab.TAB_CONTENTS_SEPARATOR}" & _window_index & "${Tab.TAB_CONTENTS_SEPARATOR}" & _tab_index & "\\n")
              set _tab_index to _tab_index + 1
            end repeat
            set _window_index to _window_index + 1
            if _window_index > count windows then exit repeat
          end repeat
        end tell
        return _output
    `);

  return openTabs
    .split("\n")
    .filter((line) => line.length !== 0)
    .map((line) => Tab.parse(line));
}
