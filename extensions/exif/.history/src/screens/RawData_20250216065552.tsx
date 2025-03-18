import type { Tags } from "exifreader";
import { useMemo } from "react";
import { Action, ActionPanel, Detail } from "@raycast/api";

interface Props {
  tags: Tags;
}

export default function Command(props: Props) {
  const { tags } = props;
  const tagsString = useMemo(() => JSON.stringify(tags, null, 2), [tags]);

  return (
    <Detail
      navigationTitle="Raw EXIF Data"
      markdown={["## Raw Tags", "```json", tagsString, "```"].join("\n")}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy JSON" content={tagsString} />
        </ActionPanel>
      }
    />
  );
}
