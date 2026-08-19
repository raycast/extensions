import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showInFinder,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { homedir } from "node:os";
import { join } from "node:path";
import { runYerd, TIMEOUTS } from "../yerd/cli";
import type { DbListResponse } from "../yerd/types";

function failureTitle(e: unknown): string {
  return (e as { userMessage?: string }).userMessage ?? "Failed";
}

/** Destination for plain-SQL dumps: ~/Downloads/<service>-<db>-<timestamp>.sql */
function backupDestination(serviceId: string, name: string): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  return join(homedir(), "Downloads", `${serviceId}-${name}-${stamp}.sql`);
}

export function DatabasesView({ serviceId }: { serviceId: string }) {
  const { isLoading, data, revalidate } = useCachedPromise(
    () => runYerd<DbListResponse>(["db", "list", serviceId]),
    [],
    {
      keepPreviousData: true,
    },
  );

  // Shape verified live for mysql only ({ name }); other engines assumed
  // identical — render the name and nothing else so unknown shapes degrade.
  const dbs = data?.databases ?? [];

  async function dropDb(name: string) {
    const ok = await confirmAlert({
      title: `Drop database "${name}"?`,
      message: "This cannot be undone. All data will be permanently deleted.",
      primaryAction: { title: "Drop", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Dropping ${name}…`,
    });
    try {
      await runYerd(["db", "drop", serviceId, name], {
        timeoutMs: TIMEOUTS.mutate,
      });
      toast.style = Toast.Style.Success;
      toast.title = `Dropped ${name}`;
      revalidate();
    } catch (e) {
      await showFailureToast(e, { title: failureTitle(e) });
    }
  }

  async function backupDb(name: string) {
    const destination = backupDestination(serviceId, name);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Backing up ${name}…`,
    });
    try {
      // Response is `{ type: "ok" }` (verified live) — the dump lands at `destination`.
      await runYerd(["db", "backup", serviceId, name, destination], {
        timeoutMs: TIMEOUTS.dbTransfer,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Backup saved";
      toast.message = destination;
      toast.primaryAction = {
        title: "Show in Finder",
        onAction: () => {
          showInFinder(destination);
        },
      };
    } catch (e) {
      await showFailureToast(e, { title: failureTitle(e) });
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${serviceId} Databases`}
      searchBarPlaceholder={`Search ${serviceId} databases…`}
    >
      <List.Section title={`${serviceId} Databases`}>
        {dbs.map((db) => (
          <List.Item
            key={db.name}
            title={db.name}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Name" content={db.name} />
                <Action
                  title="Backup"
                  icon={Icon.Download}
                  onAction={() => backupDb(db.name)}
                />
                <Action.Push
                  title="Restore from File"
                  icon={Icon.Upload}
                  target={<RestoreForm serviceId={serviceId} name={db.name} />}
                />
                <Action
                  title="Drop"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => dropDb(db.name)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Actions">
        <List.Item
          title="Create Database"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Database"
                icon={Icon.Plus}
                target={
                  <CreateForm serviceId={serviceId} onCreated={revalidate} />
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function CreateForm({
  serviceId,
  onCreated,
}: {
  serviceId: string;
  onCreated: () => void;
}) {
  const { pop } = useNavigation();

  async function submit(values: { name: string }) {
    const name = values.name.trim();
    if (!name) return;
    pop();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Creating ${name}…`,
    });
    try {
      await runYerd(["db", "create", serviceId, name], {
        timeoutMs: TIMEOUTS.mutate,
      });
      toast.style = Toast.Style.Success;
      toast.title = `Created ${name}`;
      onCreated();
    } catch (e) {
      await showFailureToast(e, { title: failureTitle(e) });
    }
  }

  return (
    <Form
      navigationTitle="Create Database"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create"
            icon={Icon.Plus}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Database Name"
        placeholder="my_database"
        info="Letters, digits and underscores; must start with a letter or underscore."
      />
    </Form>
  );
}

function RestoreForm({ serviceId, name }: { serviceId: string; name: string }) {
  const { pop } = useNavigation();

  async function submit(values: { file: string[] }) {
    const file = values.file[0];
    if (!file) return;
    pop();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Restoring ${name}…`,
    });
    try {
      await runYerd(["db", "restore", serviceId, name, file], {
        timeoutMs: TIMEOUTS.dbTransfer,
      });
      toast.style = Toast.Style.Success;
      toast.title = `Restored ${name}`;
    } catch (e) {
      await showFailureToast(e, { title: failureTitle(e) });
    }
  }

  return (
    <Form
      navigationTitle={`Restore ${name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Restore"
            icon={Icon.Upload}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="SQL File"
        allowMultipleSelection={false}
      />
      <Form.Description text="Replays a plain-SQL dump into the existing database." />
    </Form>
  );
}
