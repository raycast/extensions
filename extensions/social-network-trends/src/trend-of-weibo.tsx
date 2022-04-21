import { Action, ActionPanel, Clipboard, Icon, List, open, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import {
  douyinSearchUrl,
  ResponseDataWeiBo,
  TrendWeiBo,
  weiboSearchUrl,
  weiboTrendApi,
  zhihuSearchUrl,
} from "./utils/trend-utils";
import { isEmpty, listIcon, listIconDark } from "./utils/common-utils";

export default function TrendOfWeibo() {
  const [trends, setTrends] = useState<TrendWeiBo[]>([]);
  const [searchContent, setSearchContent] = useState<string>("");

  useEffect(() => {
    async function _fetch() {
      try {
        fetch(weiboTrendApi)
          .then((response) => response.json() as Promise<ResponseDataWeiBo>)
          .then((data) => {
            setTrends(data.list);
          });
      } catch (e) {
        if (e instanceof AbortError) {
          return;
        }
        await showToast(Toast.Style.Failure, String(e));
      }
    }

    _fetch().then();
  }, []);

  return (
    <List
      isLoading={trends.length === 0}
      searchBarPlaceholder={"Search by WeiBo"}
      onSearchTextChange={setSearchContent}
    >
      {trends?.map((value, index) => {
        return (
          <List.Item
            id={index + value.name}
            key={index + value.name}
            icon={{ source: { light: `${listIcon[index]}`, dark: `${listIconDark[index]}` } }}
            title={value.name}
            accessories={[{ text: `${(value.hot / 10000).toFixed(1)}w` }]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Desktop}
                  title={"View in Browser"}
                  onAction={async () => {
                    try {
                      await open(value.url);
                      await showHUD(`View ${value.name} in browser`);
                    } catch (e) {
                      console.error(String(e));
                    }
                  }}
                />
                <Action
                  icon={Icon.MagnifyingGlass}
                  title={"Search by WeiBo"}
                  onAction={async () => {
                    try {
                      const _searchContent = isEmpty(searchContent) ? value.name : searchContent;
                      await open(weiboSearchUrl + encodeURIComponent(_searchContent));
                      await showHUD(`Search ${_searchContent} by WeiBo`);
                    } catch (e) {
                      console.error(String(e));
                    }
                  }}
                />
                <Action
                  icon={Icon.Link}
                  title={"Copy Trend Link"}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                  onAction={async () => {
                    await Clipboard.copy(value.url);
                    await showToast(Toast.Style.Success, "Trend link copied!");
                  }}
                />
                <Action
                  icon={Icon.Clipboard}
                  title={"Copy Trend Title"}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                  onAction={async () => {
                    await Clipboard.copy(value.name);
                    await showToast(Toast.Style.Success, "Trend name copied!");
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
