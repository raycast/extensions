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
    <Detail
      markdown={`## Raw Tags\n\`\`\`json\n${tagsString}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy JSON" content={tagsString} />
        </ActionPanel>
      }
    />
  );
}