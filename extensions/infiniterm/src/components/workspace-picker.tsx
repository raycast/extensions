import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listWorkspaces, openFolders } from "../lib/ift.ts";
import { readLastWorkspace, writeLastWorkspace } from "../lib/last-workspace.ts";
import { prioritize } from "../lib/parse.ts";

async function open(dirs: string[], workspace?: string, name?: string) {
  if (workspace && workspace !== "new") writeLastWorkspace(workspace);
  await openFolders(dirs, workspace, name);
}

function NewWorkspaceForm({ dirs }: { dirs: string[] }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open in New Workspace"
            onSubmit={async (values: { name: string }) => {
              pop();
              await open(dirs, "new", values.name);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Workspace Name" placeholder="Optional" />
    </Form>
  );
}

// `title` names what is being opened ("Open <title> in"), `loading` covers a caller still finding the folders.
export function WorkspacePicker({
  dirs,
  title,
  loading = false,
  dirsError,
}: {
  dirs: string[];
  title: string;
  loading?: boolean;
  dirsError?: Error;
}) {
  // Fails when the app is not running or predates `ift workspaces`; the list then offers the current workspace only.
  const {
    data,
    isLoading: wsLoading,
    error,
  } = useCachedPromise(async () => prioritize(await listWorkspaces(), readLastWorkspace()), [], {
    keepPreviousData: false,
  });
  const ready = dirs.length > 0;

  return (
    <List isLoading={loading || wsLoading} navigationTitle={`Open ${title}`}>
      {!ready && !loading && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="No folder found"
          description={dirsError?.message ?? "Finder gave no selection or window folder."}
        />
      )}
      {ready && (
        <List.Section title={`Open ${title} in`} subtitle={dirs.length === 1 ? dirs[0] : undefined}>
          {!error && !wsLoading && (
            <List.Item
              icon={Icon.PlusCircle}
              title="New Workspace"
              actions={
                <ActionPanel>
                  <Action title="Open in New Workspace" icon={Icon.PlusCircle} onAction={() => open(dirs, "new")} />
                  <Action.Push
                    title="Open in Named New Workspace…"
                    icon={Icon.Pencil}
                    target={<NewWorkspaceForm dirs={dirs} />}
                  />
                </ActionPanel>
              }
            />
          )}
          {error && (
            <List.Item
              icon={Icon.Window}
              title="Current Workspace"
              subtitle="Workspace list unavailable"
              accessories={[{ text: error.message }]}
              actions={
                <ActionPanel>
                  <Action title="Open in Current Workspace" onAction={() => open(dirs)} />
                </ActionPanel>
              }
            />
          )}
          {(data ?? []).map((w) => (
            <List.Item
              key={w.id}
              icon={w.active ? Icon.CircleFilled : Icon.Circle}
              title={w.name || w.id}
              accessories={[
                { text: `${w.cards} ${w.cards === 1 ? "card" : "cards"}` },
                ...(w.active ? [{ tag: "Active" }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action title="Open in This Workspace" icon={Icon.Window} onAction={() => open(dirs, w.id)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
