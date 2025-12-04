import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useState, useEffect } from "react";
import { Hub } from "../lib/hub/hub";
import SearchTags from "./SearchTags";
import { SearchTypeEnum, ImageSearchResult, ItemAccessory } from "../lib/hub/types";
import { mapFromToIcon } from "../lib/hub/utils";
import { pullImage, checkImageExists } from "../lib/hub/docker";

export default function Search(props: { searchType: SearchTypeEnum }) {
  const [images, setImages] = useState<ImageSearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [existingImages, setExistingImages] = useState<Set<string>>(new Set());

  const search = useCallback((text: string) => {
    const abortCtrl = new AbortController();
    const fn = async () => {
      setLoading(true);
      try {
        const hub = new Hub();
        const response = await hub.search({ query: text, size: 100, type: props.searchType }, abortCtrl.signal);
        setImages(response.results ?? []);
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

  useEffect(() => {
    const checkImagesExistence = async () => {
      const exist = new Set<string>();
      for (const img of images) {
        const exists = await checkImageExists(img.slug);
        if (exists) {
          exist.add(img.slug);
        }
      }
      setExistingImages(exist);
    };
    checkImagesExistence();
  }, [images]);

  return (
    <List isLoading={loading} onSearchTextChange={search} throttle>
      {images.map((item) => (
        <List.Item
          key={item.slug}
          icon={mapFromToIcon(item.source)}
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
                  <Action
                    title="Pull Image"
                    onAction={() => pullImage(item.slug)}
                    icon={Icon.Download}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  />
                </ActionPanel.Section>
              ) : null}
            </ActionPanel>
          }
          accessories={
            [
              existingImages.has(item.slug)
                ? {
                    icon: { source: Icon.Checkmark, tintColor: Color.Green },
                    tooltip: "Image exists locally",
                  }
                : null,
              {
                text: `${item.star_count}`,
                icon: Icon.Star,
                tooltip: `${item.star_count} Stars`,
              },
              {
                text: item.rate_plans[0].repositories[0].pull_count,
                icon: Icon.Download,
                tooltip: `${item.rate_plans[0].repositories[0].pull_count} Downloads`,
              },
            ].filter((item) => item !== null) as ItemAccessory[]
          }
        />
      ))}
    </List>
  );
}
