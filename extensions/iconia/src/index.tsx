import { useState } from "react";
import { Action, ActionPanel, Grid, Clipboard, showHUD, Keyboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import type { IconifyInfo } from "@iconify/types";

export default function Command() {
  const HOST = "https://api.iconify.design";
  const icones = "https://icones.js.org/collection/all";

  type Info = { prefix: string } & IconifyInfo;
  const { data } = useFetch<Record<string, IconifyInfo>>(`${HOST}/collections`);
  const categoryIconSetsMap: Record<string, Info[]> = {};
  let total = 0;

  for (const key in data) {
    const item: Info = Object.assign(data[key], { prefix: key });
    total += item.total as number;

    if (item.category) {
      const categoryIconSets = categoryIconSetsMap[item.category];
      categoryIconSets ? categoryIconSets.push(item) : (categoryIconSetsMap[item.category] = [item]);
    }
  }

  const [searchText, setSearchText] = useState("");
  const [type, setType] = useState<string>("");
  const { isLoading, data: searchResult } = useFetch<{ icons: string[]; total: number }>(
    `${HOST}/search?query=${searchText}&prefix=${type}&limit=999`,
    {
      keepPreviousData: true,
    },
  );
  const icons = searchResult?.icons || [];
  const [iconName, setIconName] = useState("");

  useFetch(`${HOST}/${iconName}.svg`, {
    onData(v: string) {
      Clipboard.copy(v);
    },
    onError: () => undefined,
  });

  return (
    <Grid
      navigationTitle={`Search Icon (${icons.length || (data && data[type] && data[type].total) || total} icons)`}
      columns={8}
      inset={Grid.Inset.Small}
      searchBarPlaceholder="Search icon or drop-down focused collection"
      filtering={false}
      throttle={true}
      searchText={searchText}
      isLoading={isLoading}
      onSearchTextChange={(text) => setSearchText(text)}
      searchBarAccessory={
        <Grid.Dropdown tooltip="测试" storeValue={true} onChange={(n) => setType(n)}>
          <Grid.Dropdown.Item title="All" value="" />
          {Object.entries(categoryIconSetsMap).map((item) => (
            <Grid.Dropdown.Section key={item[0]} title={item[0]}>
              {item[1].map((item) => (
                <Grid.Dropdown.Item key={item.name} title={`${item.name}-${item.total}`} value={item.prefix} />
              ))}
            </Grid.Dropdown.Section>
          ))}
        </Grid.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Icones" url={icones} shortcut={Keyboard.Shortcut.Common.Open} />
          <Action.OpenInBrowser
            title="Open Iconify"
            url="https://iconify.design/"
            shortcut={Keyboard.Shortcut.Common.OpenWith}
          />
        </ActionPanel>
      }
    >
      {searchText === "" && icons.length === 0 ? (
        <Grid.EmptyView
          icon={{
            source: `${HOST}/material-symbols:emoticon-rounded.svg`,
          }}
          title="Type to search for your favourite icons"
          description="Have a great day."
        />
      ) : (
        (icons || []).map((item) => (
          <Grid.Item
            key={item}
            content={`${HOST}/${item}.svg`}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy" content={item} icon={`${HOST}/simple-icons:iconify.svg`} />

                <Action
                  title="SVG"
                  onAction={() => {
                    showHUD("Copied to Clipboard");
                    setIconName(item);
                  }}
                  icon={`${HOST}/tabler:file-type-svg.svg`}
                />

                <Action.CopyToClipboard
                  title="URL"
                  content={`${HOST}/${item}.svg`}
                  icon={`${HOST}/formkit:url.svg`}
                  shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
                />

                <Action.OpenInBrowser
                  title="Open Icones"
                  url={`https://icones.js.org/collection/all?s=${item}`}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}
