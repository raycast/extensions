import { Action, Icon } from "@raycast/api";
import { type SearchResult } from "../useSearch";
import { shortcuts } from "../shortcuts";
import { messaging } from "../messaging";

interface CopyToClipboardProps {
  imageUrl: SearchResult["image_url"];
}

const CopyToClipboard = ({ imageUrl }: CopyToClipboardProps) => {
  return (
    <Action.CopyToClipboard
      title={messaging.ACTION_COPY}
      content={imageUrl}
      shortcut={shortcuts.COPY_TO_CLIPBOARD}
      icon={Icon.Link}
    />
  );
};

export { CopyToClipboard, type CopyToClipboardProps };
