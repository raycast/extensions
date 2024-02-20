import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

import { usePasswordContext } from "@/context/passwords";
import { VaultCredential } from "@/types/dcli";
import FavoriteActions from "./actions/FavoriteActions";
import PasswordActions from "./actions/password/PasswordActions";
import ShowNoteAction from "./actions/password/ShowNoteAction";
import SyncAction from "./actions/password/SyncAction";
import TotpActions from "./actions/password/TotpActions";

type Props = {
  item: VaultCredential;
};

export const ListItemPassword = ({ item }: Props) => {
  const { isInitialLoaded } = usePasswordContext();
  const itemName = item.title ?? item.url;
  const username = isInitialLoaded ? item.email ?? item.login ?? item.secondaryLogin : undefined;

  const keywords = [item.title, item.url, item.email, item.login, item.secondaryLogin].filter(Boolean);

  if (!itemName) return null;

  return (
    <List.Item
      key={item.id}
      title={itemName}
      subtitle={username}
      keywords={keywords}
      icon={getItemIcon(item)}
      accessories={getAccessories(item)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <PasswordActions item={item} />
            <TotpActions item={item} />
          </ActionPanel.Section>

          {username && (
            <Action.CopyToClipboard
              title="Copy Username"
              content={username}
              icon={Icon.Person}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
            />
          )}

          {item.url && <Action.OpenInBrowser url={item.url} shortcut={{ modifiers: ["cmd"], key: "o" }} />}
          <ShowNoteAction item={item} />
          <ActionPanel.Section title="Item Actions">
            <FavoriteActions item={item} />
          </ActionPanel.Section>
          <SyncAction />
        </ActionPanel>
      }
    />
  );
};

function isValidURL(url?: string): url is string {
  if (!url) return false;

  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

function getItemIcon(item: VaultCredential): Image.ImageLike {
  return isValidURL(item.url)
    ? getFavicon(item.url, { mask: Image.Mask.RoundedRectangle })
    : {
        source: Icon.Link,
        tintColor: Color.SecondaryText,
      };
}

function getAccessories(item: VaultCredential) {
  const accessories: List.Item.Accessory[] = [];

  if (item.otpSecret) {
    accessories.push({
      icon: Icon.Key,
      tooltip: "TOTP",
    });
  }

  if (item.note) {
    accessories.push({
      icon: Icon.Paragraph,
      tooltip: "Note",
    });
  }

  return accessories;
}
