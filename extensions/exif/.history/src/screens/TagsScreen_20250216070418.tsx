// src/screens/TagsScreen.tsx
import type { Tags } from "exifreader";
import { useEffect, useMemo } from "react";
import { ActionPanel, Action, Detail, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import useTagsMarkdown from "@/hooks/use-tags-markdown";
import RawDataScreen from "./RawData";

interface Props {
  file: string;
  tags: Tags;
}

export default function Command(props: Props) {
  const { tags, file } = props;
  const { push } = useNavigation();
  const { image, thumbnail, location, table } = useTagsMarkdown(tags, file);

  const tagsString = useMemo(() => {
    try {
      return JSON.stringify(tags, null, 2);
    } catch (error) {
      console.error('Error stringifying tags:', error);
      return '';
    }
  }, [tags]);

  useEffect(() => {
    if (!tags) {
      showToast({
        style: Toast.Style.Failure,
        title: "No EXIF data found",
        message: "Could not find any EXIF data in the image",
      });
    }
  }, [tags]);

  return (
    <Detail>
      <Detail.Markdown>
        {[image, thumbnail, location, table].join("\n")}
      </Detail.Markdown>
      <Detail.Actions>
        <ActionPanel>
          <Action.CopyToClipboard title="Copy JSON" content={tagsString} />
          {tags && (
            <Action 
              title="View Raw Tags" 
              icon={Icon.CodeBlock} 
              onAction={() => push(<RawDataScreen tags={tags} />)} 
            />
          )}
        </ActionPanel>
      </Detail.Actions>
    </Detail>
  );
}