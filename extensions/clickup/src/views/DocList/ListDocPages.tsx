import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClickUpClient } from "../../api/clickup";
import { OpenInClickUpAction } from "../../components/OpenInClickUpAction";

interface Props {
  workspaceId: string;
  docId: string;
  docName: string;
}

export function ListDocPages({ workspaceId, docId, docName }: Props) {
  const { isLoading, data: pages } = useCachedPromise(
    async (wsId: string, dId: string) => getClickUpClient().getDocPages(wsId, dId),
    [workspaceId, docId],
    { initialData: [] },
  );

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
