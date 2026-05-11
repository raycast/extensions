import { Action, closeMainWindow, Icon, launchCommand, LaunchType } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { safariAppIdentifier } from "../utils";
import { FallbackSearchType } from "../types";

async function searchInBrowser(searchText?: string) {
  if (!searchText) {
    console.error("No search text provided");
    return;
  }

  await runAppleScript(`
    tell application "${safariAppIdentifier}"
      search the web for "${searchText}"
      activate
    end tell
  `);
}

export default function SearchInBrowserAction(props: { searchText?: string; fallbackSearchType?: FallbackSearchType }) {
  return props.searchText ? (
    <Action
      title="Search in Browser"
      icon={Icon.MagnifyingGlass}
      onAction={async () => {
        if (props.fallbackSearchType === "search") {
          await searchInBrowser(props.searchText);
          await closeMainWindow({ clearRootSearch: true });
        } else if (props.fallbackSearchType === "searchHistory") {
          await launchCommand({
            name: "search-history",
            type: LaunchType.UserInitiated,
            fallbackText: props.searchText,
          });
        }
      }}
    />
  ) : null;
}
