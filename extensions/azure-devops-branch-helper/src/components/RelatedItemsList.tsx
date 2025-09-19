import { List, ActionPanel, Action, Icon } from "@raycast/api";

interface RelatedItemsListProps {
  parentItem: { id: number; title: string } | null;
  siblingItems: { id: number; title: string }[];
  relatedItems: { id: number; title: string }[];
  childItems: { id: number; title: string }[];
  onOpenWorkItem: (id: number, title?: string) => void;
}

export default function RelatedItemsList({
  parentItem,
  siblingItems,
  relatedItems,
  childItems,
  onOpenWorkItem,
}: RelatedItemsListProps) {
  return (
    <List searchBarPlaceholder="Filter related work items...">
      {parentItem && (
        <List.Section title="Parent">
          <List.Item
            key={`p-${parentItem.id}`}
            title={`#${parentItem.id}: ${parentItem.title || "Untitled"}`}
            icon={Icon.ArrowUp}
            actions={
              <ActionPanel>
                <Action
                  title="Open Work Item"
                  icon={Icon.Eye}
                  onAction={() =>
                    onOpenWorkItem(parentItem.id, parentItem.title)
                  }
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {siblingItems.length > 0 && (
        <List.Section title="Siblings">
          {siblingItems.map((s) => (
            <List.Item
              key={`s-${s.id}`}
              title={`#${s.id}: ${s.title || "Untitled"}`}
              icon={Icon.ArrowRight}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Work Item"
                    icon={Icon.Eye}
                    onAction={() => onOpenWorkItem(s.id, s.title)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {relatedItems.length > 0 && (
        <List.Section title="Related">
          {relatedItems.map((r) => (
            <List.Item
              key={`r-${r.id}`}
              title={`#${r.id}: ${r.title || "Untitled"}`}
              icon={Icon.Link}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Work Item"
                    icon={Icon.Eye}
                    onAction={() => onOpenWorkItem(r.id, r.title)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {childItems.length > 0 && (
        <List.Section title="Children">
          {childItems.map((c) => (
            <List.Item
              key={`c-${c.id}`}
              title={`#${c.id}: ${c.title || "Untitled"}`}
              icon={Icon.ArrowDown}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Work Item"
                    icon={Icon.Eye}
                    onAction={() => onOpenWorkItem(c.id, c.title)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
