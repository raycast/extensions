import type { Tags } from "exifreader";
import { type FC } from "react";

import { Action, ActionPanel, Detail } from "@raycast/api";

import useTagsMarkdown from "@/hooks/use-tags-markdown";

interface RawDataScreenProps {
  file: string;
  tags: Tags;
}

const RawDataScreen: FC<RawDataScreenProps> = ({ tags, file }) => {
  const { rawTagsMarkdown, stringifiedJson } = useTagsMarkdown(tags, file, 80);

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy JSON" content={stringifiedJson} />
        </ActionPanel>
      }
      markdown={rawTagsMarkdown}
    />
  );
};

export default RawDataScreen;
