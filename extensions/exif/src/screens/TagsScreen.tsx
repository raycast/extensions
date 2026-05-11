import type { Tags } from "exifreader";
import { parse } from "node:path";
import { type FC, useEffect } from "react";

import { Action, ActionPanel, Detail, Icon, Toast, showToast, useNavigation } from "@raycast/api";

import { TagDetails } from "@/components/TagDetails";
import useTagsMarkdown from "@/hooks/use-tags-markdown";

import RawDataScreen from "./RawData";

interface TagsScreenProps {
  file: string;
  tags: Tags;
}

const TagsScreen: FC<TagsScreenProps> = ({ tags, file }) => {
  const { push } = useNavigation();

  const { rawTagsMarkdown, stringifiedJson, image, location, thumbnail } = useTagsMarkdown(tags, file);

  const fileName = parse(file).name + parse(file).ext;

  useEffect(() => {
    showToast({ style: Toast.Style.Success, title: "Tags", message: "Tags loaded" });
  }, []);

  return (
    <Detail
      navigationTitle="Exif Tags"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy JSON" content={stringifiedJson} />
          <Action
            title="View Raw Tags"
            icon={Icon.CodeBlock}
            onAction={() => push(<RawDataScreen tags={tags} file={file} />)}
          />
        </ActionPanel>
      }
      markdown={[tags.Thumbnail?.base64 ? thumbnail : image, location, rawTagsMarkdown].join("\n")}
      metadata={<TagDetails fileName={fileName} tags={tags} />}
    />
  );
};

export default TagsScreen;
