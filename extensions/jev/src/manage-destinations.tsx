import { Action, ActionPanel, Alert, Form, Icon, List, confirmAlert, useNavigation, Keyboard } from "@raycast/api";
import { useState } from "react";
import { destinationSchema, id, type Destination } from "./lib/model";
import { saveDestination } from "./lib/destinations";
import { validateFolder } from "./lib/files";
import { ErrorView, PreferencesAction, report, useData } from "./lib/ui";
export function DestinationForm({
  destination,
  onSave,
  kind,
}: {
  destination?: Destination;
  kind?: "folder" | "collection";
  onSave: (d: Destination) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const type = destination?.kind ?? kind ?? "folder";
  const [busy, setBusy] = useState(false);
  return (
    <Form
      isLoading={busy}
      navigationTitle={destination ? "Edit Destination" : "New Destination"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Destination"
            onSubmit={async (v: { name: string; description: string; folder: string[] }) => {
              if (busy) return;
              setBusy(true);
              try {
                const d = destinationSchema.parse({
                  id: destination?.id ?? id(),
                  name: v.name,
                  description: v.description,
                  kind: type,
                  path: type === "folder" ? await validateFolder(v.folder?.[0] ?? "") : "",
                });
                await onSave(d);
                pop();
              } catch (e) {
                await report(e);
              } finally {
                setBusy(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={destination?.name ?? ""}
        placeholder={type === "folder" ? "Receipts" : "Homelab"}
      />
      <Form.TextArea
        id="description"
        title="What Belongs Here"
        defaultValue={destination?.description ?? ""}
        placeholder="Describe the content Jev should suggest for this destination."
      />
      {type === "folder" ? (
        <Form.FilePicker
          id="folder"
          title="Existing Folder"
          canChooseDirectories
          canChooseFiles={false}
          allowMultipleSelection={false}
          defaultValue={destination?.path ? [destination.path] : []}
        />
      ) : (
        <Form.Description title="Storage" text="Links in this collection are stored locally by Jev." />
      )}
    </Form>
  );
}
export default function Command() {
  const { data, loading, error, update } = useData();
  if (error) return <ErrorView error={error} />;
  const save = async (d: Destination) => {
    await update((s) => saveDestination(s, d));
  };
  const create = (
    <Action.Push
      title="New Destination"
      icon={Icon.Plus}
      target={<DestinationForm onSave={save} />}
      shortcut={Keyboard.Shortcut.Common.New}
    />
  );
  return (
    <List isLoading={loading} searchBarPlaceholder="Find document folders…">
      <List.EmptyView
        title="Configure Your Destinations"
        description="Choose existing document folders and describe what belongs there."
        actions={
          <ActionPanel>
            {create}
            <PreferencesAction />
          </ActionPanel>
        }
      />
      {(["folder"] as const).map((kind) => (
        <List.Section key={kind} title={kind === "folder" ? "Document Folders" : "Link Collections"}>
          {data.destinations
            .filter((d) => d.kind === kind)
            .map((d) => (
              <List.Item
                key={d.id}
                title={d.name}
                subtitle={d.kind === "folder" ? d.path : d.description}
                icon={d.kind === "folder" ? Icon.Folder : Icon.Bookmark}
                accessories={[
                  {
                    text:
                      d.kind === "collection"
                        ? `${data.links.filter((l) => l.collectionId === d.id).length} links`
                        : "",
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push title="Edit Destination" target={<DestinationForm destination={d} onSave={save} />} />
                    {create}
                    {d.kind === "folder" && <Action.ShowInFinder path={d.path} />}
                    <Action
                      title="Delete Destination"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        if (
                          await confirmAlert({
                            title: `Delete ${d.name}?`,
                            message: "Files are untouched. Links in this collection become Unfiled.",
                            primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                          })
                        ) {
                          try {
                            await update((s) => {
                              s.destinations = s.destinations.filter((x) => x.id !== d.id);
                              s.links.forEach((l) => {
                                if (l.collectionId === d.id) l.collectionId = "";
                              });
                            });
                          } catch (e) {
                            await report(e);
                          }
                        }
                      }}
                    />
                    <PreferencesAction />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
