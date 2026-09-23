import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { BooxClient } from "../api/boox-client";
import { ConnectionEmptyView } from "../components/connection-state";
import { usePaginatedQuery } from "../hooks/use-paginated-query";
import { describeBooxError } from "../lib/errors";
import { formatBytes, formatDate } from "../lib/format";
import { displayRemotePath, normalizeRemotePath, parentRemotePath, validateUploadName } from "../lib/paths";
import { downloadStorageEntry } from "../lib/download";
import { StorageEntry } from "../models/boox";

export function StorageView(props: { client: BooxClient; directory?: string; title?: string }) {
  const directory = normalizeRemotePath(props.directory || "/");
  const query = usePaginatedQuery(`storage:${props.client.host}:${directory}`, async (offset, limit) => {
    const page = await props.client.listStorage(directory, offset, limit, offset === 0);
    return { items: page.list, hasMore: offset + page.list.length < page.count };
  });

  return (
    <List
      isLoading={query.isLoading}
      navigationTitle={props.title || displayRemotePath(directory)}
      searchBarPlaceholder="Search files"
      pagination={query.pagination}
    >
      {query.error ? <ConnectionEmptyView error={query.error} onRetry={query.revalidate} /> : null}
      {!query.isLoading && !query.error && !query.data.length ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="Empty Folder"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Folder"
                icon={Icon.NewFolder}
                target={<CreateDirectoryForm client={props.client} parent={directory} onComplete={query.revalidate} />}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {query.data.map((entry) => (
        <List.Item
          key={entry.path}
          icon={entry.dir ? Icon.Folder : Icon.Document}
          title={entry.name}
          subtitle={entry.dir ? undefined : formatBytes(entry.size)}
          accessories={[{ text: formatDate(entry.updatedAt) }]}
          actions={
            <StorageActions client={props.client} entry={entry} directory={directory} onChanged={query.revalidate} />
          }
        />
      ))}
    </List>
  );
}

function StorageActions(props: { client: BooxClient; entry: StorageEntry; directory: string; onChanged: () => void }) {
  const { client, entry } = props;
  return (
    <ActionPanel>
      {entry.dir ? (
        <Action.Push
          title="Open Folder"
          icon={Icon.Folder}
          target={<StorageView client={client} directory={entry.path} title={entry.name} />}
        />
      ) : (
        <Action title="Download" icon={Icon.Download} onAction={() => downloadStorageEntry(client, entry)} />
      )}
      {entry.dir ? (
        <Action title="Download as ZIP" icon={Icon.Download} onAction={() => downloadStorageEntry(client, entry)} />
      ) : null}
      <Action.CopyToClipboard title="Copy BOOX Path" content={displayRemotePath(entry.path)} />
      <ActionPanel.Section title="Manage">
        <Action.Push
          title="Rename"
          icon={Icon.Pencil}
          target={<RenameStorageForm client={client} entry={entry} onComplete={props.onChanged} />}
        />
        <Action.Push
          title="Move"
          icon={Icon.ArrowRight}
          target={<RelocateStorageForm client={client} entry={entry} operation="move" onComplete={props.onChanged} />}
        />
        <Action.Push
          title="Copy"
          icon={Icon.Duplicate}
          target={<RelocateStorageForm client={client} entry={entry} operation="copy" onComplete={props.onChanged} />}
        />
        <Action.Push
          title="Create Folder Here"
          icon={Icon.NewFolder}
          target={<CreateDirectoryForm client={client} parent={props.directory} onComplete={props.onChanged} />}
        />
        <Action
          title="Delete"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: `Delete ${entry.name}?`,
              message: displayRemotePath(entry.path),
              primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
            });
            if (!confirmed) return;
            const toast = await showToast({ style: Toast.Style.Animated, title: `Deleting ${entry.name}` });
            try {
              await client.deleteStorage(entry);
              toast.style = Toast.Style.Success;
              toast.title = "Deleted from BOOX";
              props.onChanged();
            } catch (error) {
              toast.style = Toast.Style.Failure;
              toast.title = "Delete Failed";
              toast.message = describeBooxError(error);
            }
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function CreateDirectoryForm(props: { client: BooxClient; parent: string; onComplete: () => void }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();
  const [isSubmitting, setSubmitting] = useState(false);
  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Create BOOX Folder"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Folder"
            icon={Icon.NewFolder}
            onSubmit={async ({ name }: { name: string }) => {
              if (isSubmitting) return;
              const validation = validateUploadName(name);
              if (validation) return setError(validation);
              setSubmitting(true);
              try {
                await props.client.createDirectory(props.parent, name);
                await showToast({ style: Toast.Style.Success, title: "Folder Created" });
                props.onComplete();
                pop();
              } catch (reason) {
                setError(describeBooxError(reason));
              } finally {
                setSubmitting(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Parent" text={displayRemotePath(props.parent)} />
      <Form.TextField
        id="name"
        title="Name"
        placeholder="New Folder"
        error={error}
        onChange={() => setError(undefined)}
      />
    </Form>
  );
}

function RenameStorageForm(props: { client: BooxClient; entry: StorageEntry; onComplete: () => void }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();
  const [isSubmitting, setSubmitting] = useState(false);
  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Rename ${props.entry.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename"
            onSubmit={async ({ name }: { name: string }) => {
              if (isSubmitting) return;
              const validation = validateUploadName(name);
              if (validation) return setError(validation);
              setSubmitting(true);
              try {
                await props.client.renameStorage(props.entry, name);
                await showToast({ style: Toast.Style.Success, title: "Renamed on BOOX" });
                props.onComplete();
                pop();
              } catch (reason) {
                setError(describeBooxError(reason));
              } finally {
                setSubmitting(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="New Name"
        defaultValue={props.entry.name}
        error={error}
        onChange={() => setError(undefined)}
      />
    </Form>
  );
}

function RelocateStorageForm(props: {
  client: BooxClient;
  entry: StorageEntry;
  operation: "copy" | "move";
  onComplete: () => void;
}) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();
  const [isSubmitting, setSubmitting] = useState(false);
  const verb = props.operation === "copy" ? "Copy" : "Move";
  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`${verb} ${props.entry.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={verb}
            onSubmit={async ({ destination }: { destination: string }) => {
              if (isSubmitting) return;
              setSubmitting(true);
              try {
                await props.client.relocateStorage(props.entry, destination, props.operation);
                await showToast({ style: Toast.Style.Success, title: `${verb}d on BOOX` });
                props.onComplete();
                pop();
              } catch (reason) {
                setError(describeBooxError(reason));
              } finally {
                setSubmitting(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Source" text={displayRemotePath(props.entry.path)} />
      <Form.TextField
        id="destination"
        title="Destination Folder"
        defaultValue={displayRemotePath(parentRemotePath(props.entry.path) || "/")}
        placeholder="/Download"
        error={error}
        onChange={() => setError(undefined)}
      />
    </Form>
  );
}
