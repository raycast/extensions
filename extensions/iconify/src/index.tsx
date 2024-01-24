import { useState } from "react";
import {
  Action,
  ActionPanel,
  Grid,
  Clipboard,
  showHUD,
  Keyboard,
  LocalStorage,
  showToast,
  Toast,
  confirmAlert,
} from "@raycast/api";
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
  const notStoredType = type !== "stored";
  const { isLoading, data: searchResult } = useFetch<{ icons: string[]; total: number }>(
    `${HOST}/search?query=${searchText}&prefix=${type}&limit=999`,
    {
      keepPreviousData: notStoredType,
      execute: notStoredType,
    },
  );

  const [storedIcons, setStoredIcons] = useState<string[]>([]);
  const icons = notStoredType ? searchResult?.icons || [] : storedIcons.filter((v) => v.includes(searchText));
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
        <Grid.Dropdown
          tooltip="测试"
          storeValue={true}
          onChange={(n) => {
            setType(n);
            if (n === "stored") {
              LocalStorage.allItems().then((v) => {
                setStoredIcons(Object.values(v));
              });
              setSearchText("");
            }
          }}
        >
          <Grid.Dropdown.Item title="All" value="" />
          <Grid.Dropdown.Item title="Stored" value="stored" />
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
          title={notStoredType ? "Type to search for your favourite icons" : "Storage for your favourite icons"}
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
                {notStoredType && (
                  <Action
                    title="Storage"
                    icon={`${HOST}/fluent-mdl2:storage-optical.svg`}
                    onAction={() => {
                      LocalStorage.setItem(item, item);
                      showToast({
                        title: "Storage Success",
                        style: Toast.Style.Success,
                        message: "Toggle dropdown to Stored View",
                      });
                    }}
                    shortcut={Keyboard.Shortcut.Common.Pin}
                  />
                )}
                {!notStoredType && (
                  <Action
                    title="Remove"
                    icon={`${HOST}/ic:round-remove.svg`}
                    onAction={() => {
                      LocalStorage.removeItem(item);
                      setStoredIcons(storedIcons.filter((v) => v !== item));
                      showToast({ title: "Remove Success", style: Toast.Style.Success });
                    }}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                  />
                )}
                {!notStoredType && (
                  <Action
                    title="Clear"
                    icon={`${HOST}/pajamas:remove.svg`}
                    onAction={() => {
                      confirmAlert({
                        title: "Clear Storage",
                        message: "Are you sure you want to erase all storage icons?",
                      }).then(() => {
                        LocalStorage.clear();
                        setStoredIcons([]);
                        showToast({ title: "Clear Success", style: Toast.Style.Success });
                      });
                    }}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  />
                )}
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}
