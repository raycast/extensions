import type { Tags } from "exifreader";
import { type FC, useEffect, useMemo } from "react";

import { Action, ActionPanel, Detail, Icon, Toast, showToast, useNavigation } from "@raycast/api";

import useTagsMarkdown from "@/hooks/use-tags-markdown";

import RawDataScreen from "./RawData";

interface TagsScreenProps {
  file: string;
  tags: Tags;
}

const TagsScreen: FC<TagsScreenProps> = ({ tags, file }) => {
  const { push } = useNavigation();

  const tagsString = useMemo(() => {
    // Safely convert tags to a JSON string
    try {
      return JSON.stringify(
        Object.fromEntries(
          Object.entries(tags).map(([key, value]) => [
            key, 
            // Convert tag-like objects to a consistent format
            value && typeof value === 'object' && 'description' in value 
              ? { description: value.description, value: value.value }
              : value
          ])
        ), 
        null, 
        2
      );
    } catch (error) {
      console.error("Failed to stringify tags:", error);
      return "{}";
    }
  }, [tags]);

  const { table, image, location, thumbnail } = useTagsMarkdown(tags, file);

  useEffect(() => {
    showToast({ style: Toast.Style.Success, title: "Tags", message: "Tags loaded" });
  }, []);

  return (
    <Detail
      navigationTitle="Exif Tags"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy JSON" content={tagsString} />
          {tagsString.length < 10000 ? (
            <Action title="View Raw Tags" icon={Icon.CodeBlock} onAction={() => push(<RawDataScreen tags={tags} />)} />
          ) : null}
        </ActionPanel>
      }
      markdown={[image, thumbnail, location, table].join("\n")}
    />
  );
};

export default TagsScreen;
