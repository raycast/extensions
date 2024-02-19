import type { ReactElement } from "react";
import { useRef, useState } from "react";
import type { PageSpeedData } from "./types";
import { List, Action, Icon, Toast, showToast, ActionPanel } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import fetch from "node-fetch";
import { getColor, getIcon, getFavicon, isURL, stripProtocol, round } from "./utils";
import { getAllItems, addItem, removeItem } from "./storage";
import { useDebouncedValue } from "./hooks";

export default function Main(): ReactElement {
  const [input, setInput] = useState("");
  const abortable = useRef<AbortController>();

  const rawSourceText = input.trim() || "";
  const debouncedText = useDebouncedValue(rawSourceText, 1000);

  const { isLoading, data, revalidate } = usePromise(
    async (url: string) => {
      const stored = await getAllItems();
      if (!isURL(url)) {
        return stored;
      }

      const stripped = stripProtocol(url);
      const pageSpeedAPI = `https://page-speed.dev/api/run/${stripped}`;
      try {
        const response = await fetch(pageSpeedAPI, { signal: abortable.current?.signal });
        const fetched = (await response.json()) as Omit<PageSpeedData, "url">;
        const items = await addItem({
          ...fetched,
          url: stripped,
        });
        return items;
      } catch (error) {
        console.error(error, url);
        showToast(Toast.Style.Failure, "Failed to fetch data");
        return stored;
      }
    },
    [debouncedText],
    {
      abortable,
    },
  );

  return (
    <List
      searchBarPlaceholder="Enter a URL"
      isLoading={isLoading}
      onSearchTextChange={setInput}
      searchText={input}
      throttle
    >
      {data?.map((item) => (
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
              tag: { value: `Performance`, color: getColor(item.performance) },
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
