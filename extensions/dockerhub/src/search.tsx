import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
  PushAction,
  showToast,
  ToastStyle,
  Icon,
} from "@raycast/api";
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
          showToast(ToastStyle.Failure, "Please specify an image");
          return;
        }
        const result: Tag[] = await searchTag(props.image, { page_size: 50, name: text });
        setTags(result);
      }
    } catch (err) {
      showToast(ToastStyle.Failure, "Search failed", (err as Error).message);
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
          accessoryTitle={`${item.pull_count} Downloads`}
          accessoryIcon={item.logo_url.small}
          actions={
            <ActionPanel>
              <PushAction icon={Icon.List} title="Show Tags" target={<SearchTag image={item.slug} />} />
              <CopyToClipboardAction title="Copy Pull Command" content={`docker pull ${item.slug}`} />
              <OpenInBrowserAction url={item.url ? item.url : ""} />
              <CopyToClipboardAction title="Copy URL" content={item.url ? item.url : ""} />
            </ActionPanel>
          }
        />
      ))}
      {tags.map((tag: Tag) =>
        tag.images?.map((image: TagImage) => (
          <List.Item
            key={`${tag.id}-${image.digest}`}
            title={`${tag.name}`}
            subtitle={`${tag.update_time ? tag.update_time : ""} by ${tag.last_updater_username}`}
            accessoryTitle={`${image.os_arch ? image.os_arch : ""} ${image.sizeHuman ? image.sizeHuman : ""}`}
            actions={
              <ActionPanel>
                <CopyToClipboardAction title="Copy Pull Command" content={`docker pull ${props.image}:${tag.name}`} />
                <OpenInBrowserAction url={image.url ? image.url : ""} />
                <CopyToClipboardAction title="Copy URL" content={image.url ? image.url : ""} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
