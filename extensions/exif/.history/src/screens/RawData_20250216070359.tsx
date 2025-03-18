// src/screens/RawData.tsx
import type { Tags } from "exifreader";
import { useMemo } from "react";
import { ActionPanel, Action, Detail } from "@raycast/api";

interface Props {
  tags: Tags;
}

export default function Command(props: Props) {
  const { tags } = props;
  const tagsString = useMemo(() => JSON.stringify(tags, null, 2), [tags]);

  return (
    <Detail>
      <Detail.Markdown>
        {["## Raw Tags", "```json", tagsString, "```"].join("\n")}
      </Detail.Markdown>
      <Detail.Actions>
        <ActionPanel>
          <Action.CopyToClipboard title="Copy JSON" content={tagsString} />
        </ActionPanel>
      </Detail.Actions>
    </Detail>
  );
}