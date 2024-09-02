import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import useDocPages from "../../hooks/useDocPages";

export default function ListDocPages({ workspaceId, docId }: { workspaceId: string; docId: string }) {
  const { isLoading, data: pages } = useDocPages(workspaceId, docId);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search doc pages">
      <List.Section title={`Workspaces / ${workspaceId} / Docs / ${docId}`} subtitle={`${pages.length} pages`}>
        {pages.map((page) => (
          <List.Item
            key={page.id}
            icon={Icon.Document}
            title={page.name}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Eye}
                  title="View Page"
                  target={<Detail navigationTitle={page.name} markdown={`# ${page.name} \n\n ${page.content}`} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
