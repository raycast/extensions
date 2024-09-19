import { Action, closeMainWindow, Icon } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { safariAppIdentifier } from "../utils";

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

export default function SearchInBrowserAction(props: { searchText?: string }) {
  return props.searchText ? (
    <Action
      title="Search in Browser"
      icon={Icon.MagnifyingGlass}
      onAction={async () => {
        await searchInBrowser(props.searchText);
        await closeMainWindow({ clearRootSearch: true });
      }}
    />
  ) : null;
}
