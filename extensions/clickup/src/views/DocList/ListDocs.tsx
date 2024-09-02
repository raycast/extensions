import { Action, ActionPanel, Icon, List } from "@raycast/api";
import useDocs from "../../hooks/useDocs";
import ListDocPages from "./ListDocPages";

export default function ListDocs({ workspaceId }: { workspaceId: string }) {
  const { isLoading, data: docs } = useDocs(workspaceId);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search docs">
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
                  target={<ListDocPages workspaceId={workspaceId} docId={doc.id} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
