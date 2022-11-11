import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useMemo } from "react";
import { Sticker } from "./types";

export default function ShowDetail(sticker: Sticker) {
  const markdown = useMemo(() => {
    return `
# ${sticker.name}
${sticker.description}
![${sticker.name}](${sticker.image})
`;
  }, [sticker]);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={sticker.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link
            title="Organization"
            target={`https://holopin.io/@${sticker.organization.username}`}
            text={sticker.organization.name}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {sticker.UserSticker[0] && (
            <Action.OpenInBrowser url={`https://holopin.io/userbadge/${sticker.UserSticker[0].id}`} />
          )}
        </ActionPanel>
      }
    />
  );
}
