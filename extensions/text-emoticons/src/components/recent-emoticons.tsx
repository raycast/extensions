import type { FC } from "react";
import { List } from "@raycast/api";

import { EmoticonItem } from "./emoticon-item";

import { getEmoticonItemKey } from "../utils/emoticon-item-key";

import { useRecent } from "../hooks/use-recent";

export const RecentEmoticons: FC = () => {
  const { recentlyUsed } = useRecent();

  if (recentlyUsed.length === 0) {
    return null;
  }

  return (
    <List.Section title="Recently Used">
      {recentlyUsed.map((emoticon) => (
        <EmoticonItem
          key={`${getEmoticonItemKey(emoticon)}-recent`}
          emoticon={emoticon}
        />
      ))}
    </List.Section>
  );
};
//
