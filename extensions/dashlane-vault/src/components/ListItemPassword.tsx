import { Action, ActionPanel, Color, Icon, Image, List, environment } from "@raycast/api";
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
  const { isInitialLoaded, visitItem, resetRanking } = usePasswordContext();
  const itemName = item.title ?? item.url;
  const username = isInitialLoaded ? (item.email ?? item.login ?? item.secondaryLogin) : undefined;

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
              onCopy={() => visitItem(item)}
            />
          )}

          {item.url && (
            <Action.OpenInBrowser
              url={item.url}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onOpen={() => visitItem(item)}
            />
          )}
          <ShowNoteAction item={item} />
          <ActionPanel.Section title="Item Actions">
            <FavoriteActions item={item} />
            <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(item)} />
          </ActionPanel.Section>
          <SyncAction />
          {environment.isDevelopment && (
            <ActionPanel.Section title="Development">
              <Action.CopyToClipboard title="Copy Id" content={item.id} />
              <Action title="Print to Console" icon={Icon.Terminal} onAction={() => console.log(item)} />
            </ActionPanel.Section>
          )}
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

  accessories.push({
    icon: { source: Icon.Dot, tintColor: getStrengthColor(item.strength) },
    tooltip: "Strength",
  });

  return accessories;
}

function getStrengthColor(strength: number): Color {
  if (strength < 25) return Color.Red;
  if (strength < 50) return Color.Orange;
  if (strength < 75) return Color.Yellow;
  return Color.Green;
}
