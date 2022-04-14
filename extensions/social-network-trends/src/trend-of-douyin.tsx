import { Action, ActionPanel, Clipboard, Icon, List, open, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import { douyinTrendApi, douyinUrl, ResponseDataDouYin, TrendDouYin } from "./utils/trend-utils";
import { listIcon, listIconDark } from "./utils/common-utils";

export default function TrendOfDouyin() {
  const [trends, setTrends] = useState<TrendDouYin[]>([]);

  useEffect(() => {
    async function _fetch() {
      try {
        fetch(douyinTrendApi)
          .then((response) => response.json() as Promise<ResponseDataDouYin>)
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
            title={value.name}
            accessories={[{ text: `${(value.hot / 10000).toFixed(1)}w` }]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Desktop}
                  title={"Open DouYin in Browser"}
                  onAction={() => {
                    open(douyinUrl).then();
                  }}
                />
                <Action
                  icon={Icon.Clipboard}
                  title={"Copy Trend"}
                  onAction={async () => {
                    await Clipboard.copy(value.name);
                    await showToast(Toast.Style.Success, "Trend copied!");
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
