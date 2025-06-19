import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import useDocPages from "../../hooks/useDocPages";
import { OpenInClickUpAction } from "../../components/OpenInClickUpAction";

export function ListDocPages({ workspaceId, docId, docName }: { workspaceId: string; docId: string; docName: string }) {
  const { isLoading, pages } = useDocPages(workspaceId, docId);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search doc pages" navigationTitle={`${docName} Pages`}>
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
                  target={
                    <Detail
                      navigationTitle={page.name}
                      markdown={`# ${page.name} \n\n ${page.content}`}
                      actions={
                        <ActionPanel>
                          <OpenInClickUpAction route={`${workspaceId}/v/dc/${docId}/${page.id}`} />
                        </ActionPanel>
                      }
                    />
                  }
                />
                <OpenInClickUpAction route={`${workspaceId}/v/dc/${docId}/${page.id}`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
