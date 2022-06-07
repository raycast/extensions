import { ActionPanel, List, showToast, Icon, Action, Toast } from "@raycast/api";
import { searchImage, searchTag, SearchType } from "./lib/api";
import { useEffect, useState } from "react";
import { Image, Tag, TagImage } from "./lib/type";
import { SearchTag } from "./search-tag";

interface SearchProps {
  searchType: SearchType;
  text?: string;
  image?: string;
}

export function Search(props: SearchProps) {
  const [images, setImages] = useState<Image[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      await onSearchTextChange(props.text ? props.text : "");
      setLoading(false);
    })();
  }, []);

  const onSearchTextChange = async (text: string) => {
    setLoading(true);
    try {
      if (props.searchType === SearchType.IMAGE) {
        const result: Image[] = await searchImage({ q: text, type: props.searchType, page_size: 50 });
        setImages(result);
      } else if (props.searchType === SearchType.TAG) {
        if (!props.image) {
          showToast({
            style: Toast.Style.Failure,
            title: "Please specify an image",
          });
          return;
        }
        const result: Tag[] = await searchTag(props.image, { page_size: 50, name: text });
        setTags(result);
      }
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

  return (
    <List isLoading={loading} onSearchTextChange={onSearchTextChange} throttle>
      {images.map((item: Image, index: number) => (
        <List.Item
          key={index}
          title={`[${item.from}] ${item.name}`}
          subtitle={item.short_description}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.List} title="Show Tags" target={<SearchTag image={item.slug} />} />
              <Action.CopyToClipboard title="Copy Pull Command" content={`docker pull ${item.slug}`} />
              <Action.CopyToClipboard title="Copy Image Name" content={`${item.slug}`} />
              <Action.OpenInBrowser url={item.url ? item.url : ""} />
              <Action.CopyToClipboard title="Copy URL" content={item.url ? item.url : ""} />
            </ActionPanel>
          }
          accessories={[
            {
              text: `${item.pull_count} Downloads`,
              icon: item.logo_url.small,
            },
          ]}
        />
      ))}
      {tags.map((tag: Tag) =>
        tag.images?.map((image: TagImage) => (
          <List.Item
            key={`${tag.id}-${image.digest}`}
            title={`${tag.name}`}
            subtitle={`${tag.update_time ? tag.update_time : ""} by ${tag.last_updater_username}`}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Pull Command" content={`docker pull ${props.image}:${tag.name}`} />
                <Action.CopyToClipboard title="Copy Name with Tag" content={`${props.image}:${tag.name}`} />
                <Action.OpenInBrowser url={image.url ? image.url : ""} />
                <Action.CopyToClipboard title="Copy URL" content={image.url ? image.url : ""} />
              </ActionPanel>
            }
            accessories={[
              {
                text: `${image.os_arch ? image.os_arch : ""} ${image.sizeHuman ? image.sizeHuman : ""}`,
              },
            ]}
          />
        ))
      )}
    </List>
  );
}
