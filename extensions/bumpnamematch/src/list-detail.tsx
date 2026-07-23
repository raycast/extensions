import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { NameDetail } from "./name-detail";
import { removeFromList, type FavoriteList, type FavoriteListItem, type ListDetailResponse } from "./lib/api";
import { genderLabel, safeParseArray, type Gender } from "./lib/types";

const genderTint: Record<Gender, Color> = {
  male: Color.Blue,
  female: Color.Magenta,
  neutral: Color.Purple,
};

export function ListDetail({
  list,
  allLists,
  baseUrl,
  apiKey,
}: {
  list: FavoriteList;
  allLists: FavoriteList[];
  baseUrl: string;
  apiKey: string;
}) {
  const { data, isLoading, revalidate } = useFetch<ListDetailResponse>(`${baseUrl}/api/favorite-lists/${list.id}`, {
    headers: { "x-api-key": apiKey },
  });
  const items = data?.items ?? [];

  // Group rows into sections delimited by divider rows; name items go under the
  // most recent divider (or a leading untitled section).
  const sections: { title?: string; items: FavoriteListItem[] }[] = [{ items: [] }];
  for (const item of items) {
    if (item.itemType === "divider") {
      sections.push({ title: item.label ?? "Section", items: [] });
    } else {
      sections[sections.length - 1].items.push(item);
    }
  }

  const nameCount = items.filter((i) => i.itemType === "name").length;

  return (
    <List isLoading={isLoading} navigationTitle={list.name} searchBarPlaceholder={`Filter ${list.name}…`}>
      {!isLoading && nameCount === 0 ? (
        <List.EmptyView
          icon={Icon.Star}
          title="No names in this list yet"
          description="Save names from the Search Names command."
        />
      ) : (
        sections.map((section, idx) => (
          <List.Section key={idx} title={section.title}>
            {section.items.map((item) => (
              <NameItemRow
                key={item.itemId}
                item={item}
                list={list}
                allLists={allLists}
                baseUrl={baseUrl}
                apiKey={apiKey}
                onChanged={revalidate}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

function NameItemRow({
  item,
  list,
  allLists,
  baseUrl,
  apiKey,
  onChanged,
}: {
  item: FavoriteListItem;
  list: FavoriteList;
  allLists: FavoriteList[];
  baseUrl: string;
  apiKey: string;
  onChanged: () => void;
}) {
  const name = item.name ?? "";
  const slug = encodeURIComponent(name.toLowerCase());
  const meanings = safeParseArray<string>(item.meanings);

  const accessories: List.Item.Accessory[] = [];
  if (item.gender) {
    accessories.push({
      text: genderLabel[item.gender],
      icon: { source: Icon.Circle, tintColor: genderTint[item.gender] },
    });
  }
  if (item.currentRank) accessories.push({ text: `#${item.currentRank}` });
  if (item.origin) accessories.push({ text: item.origin });

  return (
    <List.Item
      title={name}
      subtitle={meanings.slice(0, 2).join(", ")}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Details"
            icon={Icon.Eye}
            target={<NameDetail name={name} baseUrl={baseUrl} apiKey={apiKey} lists={allLists} />}
          />
          {item.id != null && (
            <Action
              title="Remove from List"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                const ok = await removeFromList(baseUrl, apiKey, list.id, item.id as number, list.name);
                if (ok) onChanged();
              }}
            />
          )}
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={`${baseUrl}/name/${slug}`} />
            <Action.CopyToClipboard title="Copy Name" content={name} shortcut={Keyboard.Shortcut.Common.Pin} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
