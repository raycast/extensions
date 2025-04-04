import { useState, useEffect } from "react";
import {
  ActionPanel,
  Action,
  Clipboard,
  closeMainWindow,
  Color,
  getPreferenceValues,
  Icon,
  List,
  open,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { getLinks } from "./utils/bento-loader";
import { isValidUrl } from "./utils/url-checker";

const preferences: ExtensionPreferences = getPreferenceValues();
// Whether to display favicons in the user interface
const userInterfaceFavicon = Boolean(preferences.userInterfaceFavicon);

/**
 * The entry point of Search Links command.
 *
 * This component returns a list of links retrieved from a Bento profile.
 *
 * @returns {JSX.Element} The rendered component.
 */
export default function Command() {
  const [entries, setEntries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getLinks()
      .then(setEntries, (e: { message: string }) => {
        showToast(Toast.Style.Failure, "Error", e.message);
      })
      .then(() => setIsLoading(false));
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Links in Bento">
      {entries.map((entry, i) => (
        <List.Item
          key={i}
          icon={
            userInterfaceFavicon
              ? isValidUrl(entry)
                ? getFavicon(entry, { fallback: Icon.QuestionMarkCircle })
                : { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText }
              : undefined
          }
          title={entry}
          actions={
            <ActionPanel>
              <Action
                title="Paste Link"
                icon={Icon.BlankDocument}
                onAction={() => {
                  Clipboard.paste(entry).then(() => closeMainWindow());
                }}
              />
              <Action
                title="Copy Link"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                onAction={() => {
                  Clipboard.copy(entry);
                  showHUD("Link has been copied to clipboard");
                }}
              />
              <Action
                title="Open URL"
                icon={Icon.Globe}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={() => {
                  open(entry);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        title="No Links Found"
        description={entries.length === 0 ? "Your Bento seems to have no links" : "Try adjusting your search"}
      />
    </List>
  );
}
