import { runAppleScript } from "@raycast/utils";
import { Tab } from "../interfaces";
import { LocalStorage } from "@raycast/api";

export async function getOpenTabs(useOriginalFavicon: boolean): Promise<Tab[]> {
  const faviconFormula = useOriginalFavicon
    ? `execute t javascript ¬
        "document.head.querySelector('link[rel~=icon]') ? document.head.querySelector('link[rel~=icon]').href : '';"`
    : '""';

  try {
    const openTabs = await runAppleScript(`
      set _output to ""
      tell application "Google Chrome"
        set _active_window_id to get id of front window as inches as string
        set _active_tab_index to get active tab index of front window as string

        repeat with w in windows
          set _w_id to get id of w as inches as string
          set _tab_index to 1
          repeat with t in tabs of w
            set _title to get title of t
            set _url to get URL of t
            set _favicon to ${faviconFormula}
            set _is_active to "0"
            if (_w_id = _active_window_id) and (_tab_index as string = _active_tab_index) then
              set _is_active to "1"
            end if
            set _output to (_output & _title & "${Tab.TAB_CONTENTS_SEPARATOR}" & _url & "${Tab.TAB_CONTENTS_SEPARATOR}" & _favicon & "${Tab.TAB_CONTENTS_SEPARATOR}" & _w_id & "${Tab.TAB_CONTENTS_SEPARATOR}" & _tab_index & "${Tab.TAB_CONTENTS_SEPARATOR}" & _is_active & "\\n")
            set _tab_index to _tab_index + 1
          end repeat
        end repeat
      end tell
      return _output
  `);

    const tabs = openTabs
      .split("\n")
      .filter((line) => line.length !== 0)
      .map((line) => Tab.parse(line));

    // Sort tabs so the active tab appears first
    return tabs.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return 0;
    });
  } catch (err) {
    if ((err as Error).message.includes('Can\'t get application "Google Chrome"')) {
      LocalStorage.removeItem("is-installed");
    }
    return [];
  }
}
