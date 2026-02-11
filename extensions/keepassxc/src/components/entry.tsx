import { JSX } from "react/jsx-runtime";
import {
  Action,
  ActionPanel,
  Color,
  Clipboard,
  closeMainWindow,
  getPreferenceValues,
  Icon,
  List,
  open,
  showToast,
  showHUD,
  Toast,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";

import { arrayToEntry, processPlaceholders } from "../utils/placeholder-processor";
import { getTOTPCode } from "../utils/totp";
import { isValidUrl } from "../utils/url-checker";
import { getEntryId } from "../utils/entry-helper";
import { PinLoader } from "../utils/pin-loader";

// Whether to show favicons in the UI
const userInterfaceFavicon = getPreferenceValues().userInterfaceFavicon;

/**
 * Component representing a single KeePass entry
 *
 * @param {Object} props - The component props
 * @param {string[]} props.entry - The entry data
 * @param {Set<string>} props.pinnedIds - The set of pinned entry IDs
 * @param {(newPinnedIds: Set<string>) => void} props.setPinnedIds - A function to update the pinned IDs
 * @returns {JSX.Element} - The rendered entry component
 */
export default function Entry({
  entry,
  pinnedIds,
  setPinnedIds,
}: {
  entry: string[];
  pinnedIds: Set<string>;
  setPinnedIds: (newPinnedIds: Set<string>) => void;
}): JSX.Element {
  const entryId = getEntryId(entry);
  const isPinned = pinnedIds.has(entryId);

  return (
    <List.Item
      key={entryId}
      title={entry[1]}
      icon={
        userInterfaceFavicon
          ? isValidUrl(entry[4])
            ? getFavicon(entry[4], { fallback: Icon.QuestionMarkCircle })
            : { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText }
          : undefined
      }
      subtitle={{ value: entry[2], tooltip: "Username" }}
      accessories={[
        isPinned ? { icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Pinned" } : {},
        entry[0] !== ""
          ? { tag: { value: entry[0], color: Color.SecondaryText }, icon: Icon.Folder, tooltip: "Folder" }
          : {},
        {
          icon: { source: Icon.Clock, tintColor: entry[6] !== "" ? Color.Green : Color.SecondaryText },
          tooltip: entry[6] !== "" ? "TOTP Set" : "TOTP Unset",
        },
        {
          icon: { source: Icon.Key, tintColor: entry[3] !== "" ? Color.Green : Color.SecondaryText },
          tooltip: entry[3] !== "" ? "Password Set" : "Password Unset",
        },
        {
          icon: { source: Icon.Link, tintColor: entry[4] !== "" ? Color.Green : Color.SecondaryText },
          tooltip: entry[4] !== "" ? "URL Set" : "URL Unset",
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Paste">
            <Action
              title="Paste Password"
              icon={Icon.BlankDocument}
              onAction={() => {
                if (entry[3] !== "") {
                  const processedPassword = processPlaceholders(entry[3], arrayToEntry(entry));
                  Clipboard.paste(processedPassword).then(() => closeMainWindow());
                } else {
                  showToast(Toast.Style.Failure, "Error", "No Password Set");
                }
              }}
            />
            <Action
              title="Paste Username"
              icon={Icon.BlankDocument}
              shortcut={{ modifiers: ["shift"], key: "enter" }}
              onAction={() => {
                if (entry[2] !== "") {
                  const processedUsername = processPlaceholders(entry[2], arrayToEntry(entry));
                  Clipboard.paste(processedUsername).then(() => closeMainWindow());
                } else {
                  showToast(Toast.Style.Failure, "Error", "No Username Set");
                }
              }}
            />
            <Action
              title="Paste TOTP"
              icon={Icon.BlankDocument}
              shortcut={{ modifiers: ["opt"], key: "enter" }}
              onAction={() => {
                if (entry[6] !== "") {
                  try {
                    Clipboard.paste(getTOTPCode(entry[6])).then(() => closeMainWindow());
                  } catch {
                    showToast(Toast.Style.Failure, "Error", "Invalid TOTP URL");
                  }
                } else {
                  showToast(Toast.Style.Failure, "Error", "No TOTP Set");
                }
              }}
            />
            <Action
              title="Paste URL"
              icon={Icon.BlankDocument}
              shortcut={{ modifiers: ["ctrl"], key: "enter" }}
              onAction={() => {
                if (entry[4] !== "") {
                  const processedUrl = processPlaceholders(entry[4], arrayToEntry(entry));
                  Clipboard.paste(processedUrl).then(() => closeMainWindow());
                } else {
                  showToast(Toast.Style.Failure, "Error", "No URL Set");
                }
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action
              title="Copy Password"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "g" }}
              onAction={() => {
                if (entry[3] !== "") {
                  const processedPassword = processPlaceholders(entry[3], arrayToEntry(entry));
                  Clipboard.copy(processedPassword, { concealed: true });
                  showHUD("Password has been copied to clipboard");
                } else showToast(Toast.Style.Failure, "Error", "No Password Set");
              }}
            />
            <Action
              title="Copy Username"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
              onAction={() => {
                if (entry[2] !== "") {
                  const processedUsername = processPlaceholders(entry[2], arrayToEntry(entry));
                  Clipboard.copy(processedUsername);
                  showHUD("Username has been copied to clipboard");
                } else showToast(Toast.Style.Failure, "Error", "No Username Set");
              }}
            />
            <Action
              title="Copy TOTP"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={() => {
                if (entry[6] !== "") {
                  try {
                    Clipboard.copy(getTOTPCode(entry[6]), { concealed: true });
                    showHUD("TOTP has been copied to clipboard");
                  } catch {
                    showToast(Toast.Style.Failure, "Error", "Invalid TOTP URL");
                  }
                } else showToast(Toast.Style.Failure, "Error", "No TOTP Set");
              }}
            />
            <Action
              title="Copy URL"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
              onAction={() => {
                if (entry[4] !== "") {
                  const processedUrl = processPlaceholders(entry[4], arrayToEntry(entry));
                  Clipboard.copy(processedUrl);
                  showHUD("URL has been copied to clipboard");
                } else {
                  showToast(Toast.Style.Failure, "Error", "No URL Set");
                }
              }}
            />
          </ActionPanel.Section>
          <Action
            title="Open URL"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["shift", "cmd"], key: "u" }}
            onAction={() => {
              if (entry[4] !== "") {
                open(entry[4]);
              } else {
                showToast(Toast.Style.Failure, "Error", "No URL Set");
              }
            }}
          />
          <Action
            title={isPinned ? "Unpin Entry" : "Pin Entry"}
            icon={isPinned ? Icon.StarDisabled : Icon.Star}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={() => {
              const newPinnedIds = new Set(pinnedIds);
              if (newPinnedIds.has(entryId)) {
                newPinnedIds.delete(entryId);
              } else {
                newPinnedIds.add(entryId);
              }
              setPinnedIds(newPinnedIds);
              PinLoader.savePinnedIds(newPinnedIds);
            }}
          />
        </ActionPanel>
      }
    />
  );
}
