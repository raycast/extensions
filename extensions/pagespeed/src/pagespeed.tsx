import type { ReactElement } from "react";
import { useState } from "react";
import { List, Action, Icon, Toast, showToast, ActionPanel, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getColor, getIcon, getFavicon, round } from "./utils";
import { getAllItems, removeItem } from "./storage";
import { useDebouncedValue } from "./hooks";

export default function Main(): ReactElement {
  const [input, setInput] = useState("");
  const rawSourceText = input.trim() || "";
  const debouncedText = useDebouncedValue(rawSourceText, 20);

  const { isLoading, data, revalidate } = usePromise(
    async (txt: string) => {
      const stored = await getAllItems();
      const filtered = stored.filter((item) => item.url.includes(txt));
      return filtered;
    },
    [debouncedText],
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setInput} searchText={input} throttle>
      {(!data || data.length === 0) && !isLoading && (
        <List.EmptyView icon={Icon.ExclamationMark} title="No Reports Found" />
      )}
      {data &&
        data.length > 0 &&
        data?.map((item) => (
          <List.Item
            key={item.url}
            title={item.url}
            icon={getFavicon(item.url)}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in Page-Speed.dev"
                  url={`https://page-speed.dev/${item.url}`}
                  icon={Icon.Bolt}
                />
                <Action.OpenInBrowser title="Open URL in Browser" url={`https://${item.url}`} icon={Icon.Globe} />
                <Action
                  icon={Icon.Trash}
                  title="Remove"
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    await removeItem(item.url);
                    await revalidate();
                    showToast(Toast.Style.Success, "Removed");
                  }}
                />
              </ActionPanel>
            }
            accessories={[
              {
                tag: { value: `Performarce`, color: getColor(item.performance) },
                tooltip: `Performance: ${round(item.performance)}`,
                icon: getIcon(item.performance),
              },

              {
                tag: { value: `Accessibility`, color: getColor(item.accessibility) },
                tooltip: `Accessibility: ${round(item.accessibility)}`,
                icon: getIcon(item.accessibility),
              },

              {
                tag: { value: `SEO`, color: getColor(item.seo) },
                tooltip: `SEO: ${round(item.seo)}`,
                icon: getIcon(item.seo),
              },
              {
                tag: { value: `Best Practices`, color: getColor(item.bestPractices) },
                tooltip: `Best Practices: ${round(item.bestPractices)}`,
                icon: getIcon(item.bestPractices),
              },
            ]}
          />
        ))}
    </List>
  );
}
