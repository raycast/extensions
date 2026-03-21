import { type ComponentType, memo, useMemo } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { ArchiveItem } from "@/api";
import { useMirrorDomain } from "@/hooks/use-mirror-domain";
import { ArchiveListItemDetail } from "@/components/ArchiveListItemDetail";
import { TestMirrorsAction } from "@/components/TestMirrorsAction";

interface ArchiveListItemProps {
  item: ArchiveItem;
}

const ArchiveListItemF = ({ item }: ArchiveListItemProps) => {
  const { url: mirror } = useMirrorDomain();
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
          <ActionPanel.Section title="Actions">
            <Action.OpenInBrowser title="Open in Browser" url={`${mirror}/md5/${item.id}`} icon={Icon.Globe} />
            <Action.CopyToClipboard
              title="Copy URL to Clipboard"
              content={`${mirror}/md5/${item.id}`}
              icon={Icon.Clipboard}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Mirrors">
            <TestMirrorsAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export const ArchiveListItem = memo(ArchiveListItemF) as ComponentType<ArchiveListItemProps>;
