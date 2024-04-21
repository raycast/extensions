import type { FC } from "react";
import { Action, ActionPanel, List, getPreferenceValues } from "@raycast/api";

import { Emoticon } from "../types/emoticons";
import { useRecent } from "../hooks/use-recent";

type EmoticonItemProps = {
  emoticon: Emoticon;
};

export const EmoticonItem: FC<EmoticonItemProps> = ({ emoticon }) => {
  const { "recent-items-number": recentItemsNumber } = getPreferenceValues();

  const { name, emoticon: symbol } = emoticon;
  const { addToRecentlyUsed } = useRecent(parseInt(recentItemsNumber, 10));

  return (
    <List.Item
      title={name}
      accessories={[{ text: { value: symbol } }]}
      actions={
        <ActionPanel>
          <Action.Paste
            content={symbol}
            onPaste={() => addToRecentlyUsed(emoticon)}
          />
          <Action.CopyToClipboard
            content={symbol}
            onCopy={() => addToRecentlyUsed(emoticon)}
          />
        </ActionPanel>
      }
    />
  );
};
