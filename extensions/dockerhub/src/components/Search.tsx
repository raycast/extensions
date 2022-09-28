import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useState, useEffect } from "react";
import { Hub } from "../lib/hub/hub";
import SearchTags from "./SearchTags";
import { SearchTypeEnum, Summary } from "../lib/hub/types";
import { mapFromToIcon } from "../lib/hub/utils";

export default function Search(props: { searchType: SearchTypeEnum }) {
  const [images, setImages] = useState<Summary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const search = useCallback((text: string) => {
    const abortCtrl = new AbortController();
    const fn = async () => {
      setLoading(true);
      try {
        const hub = new Hub();
        const result = await hub.search({ q: text, page_size: 100, type: props.searchType }, abortCtrl.signal);
        setImages(result.summaries ?? []);
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: (err as Error).message,
        });
      } finally {
        setLoading(false);
      }
    };
    fn();
    return () => abortCtrl.abort();
  }, []);

  useEffect(() => {
    search("");
  }, []);

  return (
    <List isLoading={loading} onSearchTextChange={search} throttle>
      {images.map((item) => (
        <List.Item
          key={item.slug}
          icon={mapFromToIcon(item.from)}
          title={item.name}
          subtitle={item.short_description}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.url ?? ""} />
              <Action.CopyToClipboard title="Copy URL" content={item.url ?? ""} />
              {props.searchType === SearchTypeEnum.IMAGE ? (
                <ActionPanel.Section title="Image">
                  <Action.Push icon={Icon.List} title="Show Tags" target={<SearchTags repo={item.slug} />} />
                  <Action.CopyToClipboard title="Copy Pull Command" content={`docker pull ${item.slug}`} />
                  <Action.CopyToClipboard title="Copy Image Name" content={`${item.slug}`} />
                </ActionPanel.Section>
              ) : null}
            </ActionPanel>
          }
          accessories={[
            {
              text: `${item.star_count}`,
              icon: Icon.Star,
              tooltip: `${item.star_count} Stars`,
            },
            {
              text: item.pull_count,
              icon: Icon.Download,
              tooltip: `${item.pull_count} Downloads`,
            },
          ]}
        />
      ))}
    </List>
  );
}
