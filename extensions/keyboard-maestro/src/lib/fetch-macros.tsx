import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { TypeMacroGroup, Preferences } from "./types";
import { runAppleScript } from "run-applescript";
import plist from "plist";

export async function fetchMacros() {
  const preferences = getPreferenceValues<Preferences>();

  try {
    const scriptResult = await runAppleScript(`tell application "Keyboard Maestro Engine"
            set macroList to getmacros with asstring
            end tell`);
    const data = plist.parse(scriptResult) as TypeMacroGroup[];

    // Filtering groups with filter pattern and enabled groups
    const filterPattern = preferences.filterPattern.trim();
    const hasFilter = filterPattern !== "";
    let matchFunction: (groupName: string) => boolean;

    if (hasFilter) {
      if (filterPattern.startsWith('"') && filterPattern.endsWith('"')) {
        const exactMatch = filterPattern.slice(1, -1).toLowerCase();
        matchFunction = (groupName) => groupName.toLowerCase() === exactMatch;
      } else if (preferences.useRegex) {
        let regexPattern: RegExp;
        try {
          regexPattern = new RegExp(filterPattern, "i");
        } catch (e) {
          showToast({ style: Toast.Style.Failure, title: "Error", message: "Invalid regular expression" });
          return;
        }
        matchFunction = (groupName) => regexPattern.test(groupName);
      } else {
        const partialMatch = filterPattern.toLowerCase();
        matchFunction = (groupName) => groupName.toLowerCase().includes(partialMatch);
      }
    } else {
      matchFunction = () => true;
    }

    // Filtering groups with enabled macros
    const filteredData = data
      .filter((group) => group.enabled && group.name && matchFunction(group.name))
      .map((group) => {
        const macros = preferences.showDisabled ? group.macros : group.macros?.filter((macro) => macro.enabled);
        return { ...group, macros };
      });
    return filteredData;
  } catch {
    showToast({ style: Toast.Style.Failure, title: "Error", message: "Unable to list Macros" });
  }
}
