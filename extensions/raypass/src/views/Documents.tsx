import { List, ActionPanel, Icon, Color } from "@raycast/api";
import { useDocuments } from "../hooks";
import {
  DeleteDocumentAction,
  SetActiveDocument,
  NewDocumentAction,
  ShowDocument,
  RefreshLocalReferencesActions,
  ExitRayPassAction,
} from "../actions";
import { NoDocuments } from "../components";

export const Documents: React.FC = () => {
  const { data: documents, isLoading, revalidate } = useDocuments();

  return (
    <List isLoading={isLoading} navigationTitle="Manage Documents" searchBarPlaceholder="Search Documents">
      {!documents || documents.length === 0 ? (
        <NoDocuments revalidateDocuments={revalidate} />
      ) : (
        <List.Section title="Documents">
          {documents
            .sort((a, b) => {
              if (a.isActive && !b.isActive) return -1;
              if (!a.isActive && b.isActive) return 1;
              return a.name.localeCompare(b.name);
            })
            .map(({ name, isActive, isEncrypted }) => {
              return (
                <List.Item
                  key={name}
                  subtitle={isActive ? "Active" : undefined}
                  title={name}
                  icon={{ source: Icon.Document, tintColor: isActive ? Color.Green : Color.SecondaryText }}
                  accessories={[
                    { text: isEncrypted ? "Encrypted" : "Plain", icon: isEncrypted ? Icon.Lock : Icon.LockUnlocked },
                  ]}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="Manage Document">
                        <SetActiveDocument doc={{ name, isActive }} />
                        <ShowDocument name={name} />
                        <DeleteDocumentAction doc={{ name, isActive }} revalidate={revalidate} />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="RayPass Actions">
                        <NewDocumentAction revalidateDocuments={revalidate} />
                        <RefreshLocalReferencesActions />
                        <ExitRayPassAction />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
        </List.Section>
      )}
    </List>
  );
};
