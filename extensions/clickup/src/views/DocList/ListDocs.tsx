import { Action, ActionPanel, Icon, List } from "@raycast/api";
import useDocs from "../../hooks/useDocs";
import { ListDocPages } from "./ListDocPages";
import { OpenInClickUpAction } from "../../components/OpenInClickUpAction";

export function ListDocs({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  const { isLoading, docs } = useDocs(workspaceId);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search docs" navigationTitle={`${workspaceName} Docs`}>
      <List.Section title={`Workspaces / ${workspaceId}`} subtitle={`${docs.length} docs`}>
        {docs.map((doc) => (
          <List.Item
            key={doc.id}
            icon={Icon.Document}
            title={doc.name}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Eye}
                  title="Doc Pages"
                  target={<ListDocPages workspaceId={workspaceId} docId={doc.id} docName={doc.name} />}
                />
                <OpenInClickUpAction route={`${workspaceId}/v/dc/${doc.id}`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
