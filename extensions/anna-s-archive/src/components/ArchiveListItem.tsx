import { memo, useMemo } from "react";

import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";

import type { ArchiveItem } from "@/api/archive";

import ArchiveListItemDetail from "./ArchiveListItemDetail";

interface ArchiveListItemProps {
  item: ArchiveItem;
}

const mirror = getPreferenceValues<Preferences>().mirror ?? "https://annas-archive.org";

const ArchiveListItemF = ({ item }: ArchiveListItemProps) => {
  const icon = useMemo(() => {
    if (item.cover !== null) {
      return { source: item.cover };
    }
    return { source: Icon.Book };
  }, [item.cover]);
  return (
    <List.Item
      title={item.title}
      icon={icon}
      detail={<ArchiveListItemDetail item={item} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={`${mirror}/md5/${item.id}`} />
          <Action.CopyToClipboard title="Copy URL to Clipboard" content={`${mirror}/md5/${item.id}`} />
        </ActionPanel>
      }
    />
  );
};

const ArchiveListItem = memo(ArchiveListItemF);

export default ArchiveListItem;
