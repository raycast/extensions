import { Action, ActionPanel, Grid, Icon, Keyboard } from "@raycast/api";
import { useState } from "react";
import CommonActions from "./utils/commonActions";
import ItemActions from "./utils/itemActions";
import { useCoolSites } from "./utils/useCoolSites";

export default function Command() {
  const { coolSites, tags, isLoading, error, revalidate } = useCoolSites();
  const [tag, setTag] = useState<string | null>(null);
  return (
    <Grid
      isLoading={isLoading}
      searchBarPlaceholder="Search for a cool site"
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      columns={4}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter by tag" onChange={(newValue) => setTag(newValue || null)} value={tag || ""}>
          <Grid.Dropdown.Item title="All tags" value={""} />
          {tags.map((tag) => (
            <Grid.Dropdown.Item key={tag} title={tag} value={tag} />
          ))}
        </Grid.Dropdown>
      }
    >
      <Grid.EmptyView
        icon={error ? Icon.Warning : Icon.MagnifyingGlass}
        title={error ? "Could Not Load Cool Sites" : tag ? "No Sites With This Tag" : "No Cool Sites Found"}
        description={error?.message}
        actions={
          error ? (
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          ) : undefined
        }
      />
      {coolSites
        ?.filter((item) => (!tag ? true : item.tags.includes(tag)))
        .map((item) => (
          <Grid.Item
            key={item.id}
            title={item.title}
            content={item.thumbnail || item.favicon || Icon.Globe}
            subtitle={new URL(item.url).hostname}
            accessory={{ icon: item.favicon || Icon.Globe, tooltip: item.tags.join(", ") }}
            actions={
              <ActionPanel>
                <ItemActions item={item} />
                <CommonActions />
              </ActionPanel>
            }
            id={item.id}
            keywords={item.tags}
          />
        ))}
    </Grid>
  );
}
