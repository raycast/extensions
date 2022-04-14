import { Action, ActionPanel, Clipboard, Icon, List, open, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import { ResponseDataZhiHu, TrendZhiHu, zhihuTrendApi } from "./utils/trend-utils";
import { listIcon, listIconDark } from "./utils/common-utils";

export default function TrendOfZhihu() {
  const [trends, setTrends] = useState<TrendZhiHu[]>([]);

  useEffect(() => {
    async function _fetch() {
      try {
        fetch(zhihuTrendApi)
          .then((response) => response.json() as Promise<ResponseDataZhiHu>)
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
    <List isLoading={trends.length === 0} searchBarPlaceholder={"Search trends"}>
      {trends?.map((value, index) => {
        return (
          <List.Item
            id={index + value.name}
            key={index + value.name}
            icon={{ source: { light: `${listIcon[index]}`, dark: `${listIconDark[index]}` } }}
            title={value.query}
            accessories={[{ text: `${value.name}` }]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Globe}
                  title={"Search In Browser"}
                  onAction={async () => {
                    try {
                      await open(value.url);
                      await showHUD(`Search ${value.name} in browser`);
                    } catch (e) {
                      console.error(String(e));
                    }
                  }}
                />
                <Action
                  icon={Icon.Link}
                  title={"Copy Trend Link"}
                  onAction={async () => {
                    await Clipboard.copy(value.url);
                    await showToast(Toast.Style.Success, "Trend link copied!");
                  }}
                />
                <Action
                  icon={Icon.Clipboard}
                  title={"Copy Trend Name"}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
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
