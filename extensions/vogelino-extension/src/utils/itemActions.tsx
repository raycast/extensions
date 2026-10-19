import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import AddCoolSiteCommand from "../addCoolSite";
import ViewCoolSite from "../viewCoolSite";
import { CoolSiteType } from "./coolSiteTypesAndSchemas";

function ItemActions({
  item,
  showAddCoolSiteCommand = true,
  showViewCoolSiteCommand = true,
}: {
  item: CoolSiteType;
  showViewCoolSiteCommand?: boolean;
  showAddCoolSiteCommand?: boolean;
}) {
  return (
    <ActionPanel.Section title="Item Actions">
      {showViewCoolSiteCommand && (
        <Action.Push title="View Cool Site" icon={Icon.Eye} target={<ViewCoolSite item={item} />} />
      )}
      {showAddCoolSiteCommand && (
        <Action.Push
          title="Add Cool Site with Review"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          target={<AddCoolSiteCommand />}
        />
      )}
      <Action.OpenInBrowser
        url={item.url}
        title="Open External Link"
        icon={Icon.Globe}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      <Action.CopyToClipboard
        title="Copy External Link"
        content={item.url}
        icon={Icon.CopyClipboard}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      <Action.OpenInBrowser
        url={`https://lucasvogel.click/cool-sites/${item.id}`}
        title="Open in Portfolio"
        icon={`https://lucasvogel.click/favicon-32x32.png`}
      />
      <Action.CopyToClipboard
        title="Copy Portfolio Link"
        content={`https://lucasvogel.click/cool-sites/${item.id}`}
        icon={Icon.CopyClipboard}
      />
    </ActionPanel.Section>
  );
}

export default ItemActions;
