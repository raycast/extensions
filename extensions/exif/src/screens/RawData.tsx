import type { Tags } from "exifreader";
import { type FC, useMemo } from "react";

import { Action, ActionPanel, Detail } from "@raycast/api";

interface RawDataScreenProps {
  tags: Tags;
}

const RawDataScreen: FC<RawDataScreenProps> = ({ tags }) => {
  const tagsString = useMemo(() => JSON.stringify(tags, null, 2), [tags]);

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy JSON" content={tagsString} />
        </ActionPanel>
      }
      markdown={["## Raw Tags", "```", tagsString, "```"].join("\n")}
    />
  );
};

export default RawDataScreen;
