import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { NameDetail } from "./name-detail";
import { SaveActions } from "./save-actions";
import { type FavoriteList } from "./lib/api";
import { genderLabel, safeParseArray, type Gender, type Name } from "./lib/types";

const genderTint: Record<Gender, Color> = {
  male: Color.Blue,
  female: Color.Magenta,
  neutral: Color.Purple,
};

/**
 * A single name row with the full action set shared by the Search Names and
 * Search by Origin commands: view details, save to favorites / add to list,
 * open on the web, copy.
 */
export function NameListItem({
  name,
  baseUrl,
  apiKey,
  lists,
}: {
  name: Name;
  baseUrl: string;
  apiKey?: string;
  lists: FavoriteList[];
}) {
  const meanings = safeParseArray<string>(name.meanings);
  const slug = encodeURIComponent(name.name.toLowerCase());

  const accessories: List.Item.Accessory[] = [
    { text: genderLabel[name.gender], icon: { source: Icon.Circle, tintColor: genderTint[name.gender] } },
  ];
  if (name.currentRank) accessories.push({ text: `#${name.currentRank}` });
  accessories.push({ text: name.origin });

  return (
    <List.Item
      title={name.name}
      subtitle={meanings.slice(0, 2).join(", ")}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Details"
            icon={Icon.Eye}
            target={<NameDetail name={name.name} baseUrl={baseUrl} apiKey={apiKey} lists={lists} />}
          />
          <SaveActions nameId={name.id} baseUrl={baseUrl} apiKey={apiKey} lists={lists} />
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={`${baseUrl}/name/${slug}`} />
            <Action.CopyToClipboard title="Copy Name" content={name.name} shortcut={Keyboard.Shortcut.Common.Pin} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
