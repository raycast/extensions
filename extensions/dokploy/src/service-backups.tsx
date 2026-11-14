import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useFetch, useForm, FormValidation } from "@raycast/utils";
import { useToken } from "./instances";
import { CreateDestination } from "./destinations";
import { useComposeContainers } from "./compose-containers";
import { Backup, Destination, ErrorResult } from "./interfaces";

// Redis has no `databaseType` value in Dokploy's backup API, and libsql isn't a kind this
// extension manages at all. Compose stacks can back up a container running one of the four
// database kinds below - see `DATABASE_ENGINES` for the picker that says which.
export type BackupableKind = "postgres" | "mariadb" | "mysql" | "mongo" | "compose";
const ID_FIELDS: Record<BackupableKind, string> = {
  postgres: "postgresId",
  mariadb: "mariadbId",
  mysql: "mysqlId",
  mongo: "mongoId",
  compose: "composeId",
};
const MANUAL_BACKUP_ENDPOINTS: Record<BackupableKind, string> = {
  postgres: "backup.manualBackupPostgres",
  mariadb: "backup.manualBackupMariadb",
  mysql: "backup.manualBackupMySql",
  mongo: "backup.manualBackupMongo",
  compose: "backup.manualBackupCompose",
};
const DATABASE_ENGINES = [
  { value: "postgres", title: "Postgres" },
  { value: "mariadb", title: "MariaDB" },
  { value: "mysql", title: "MySQL" },
  { value: "mongo", title: "MongoDB" },
];

interface BackupService {
  id: string;
  type: BackupableKind;
  name: string;
  appName?: string;
}

/** The scheduled backups for one database, or one Compose stack. */
export default function ServiceBackups({ service }: { service: BackupService }) {
  const { url, headers } = useToken();
  // Falls back to the id so an unnamed service (Dokploy allows saving one without a name) still
  // reads as *a specific service* rather than the literal string "undefined".
  const displayName = service.name || service.appName || service.id;

  const {
    isLoading,
    data: backups,
    error,
    revalidate,
  } = useFetch<Backup[], Backup[]>(`${url}${service.type}.one?${ID_FIELDS[service.type]}=${service.id}`, {
    headers,
    initialData: [],
    // `backups` is a relation embedded in `<kind>.one`, confirmed live for all five kinds
    // (database and compose) - there's no endpoint scoped to just one service's backups;
    // `overview.backups` looks like it should be that but is actually an org-wide run-history
    // log, no `backupId`, one row per past run.
    async parseResponse(response) {
      if (!response.ok) {
        const err = (await response.json()) as ErrorResult;
        throw new Error(err.message);
      }
      const detail = (await response.json()) as { backups?: Backup[] };
      return detail.backups ?? [];
    },
  });

  async function runBackupNow(backup: Backup) {
    const toast = await showToast(Toast.Style.Animated, `Running ${backup.prefix}…`);
    try {
      const response = await fetch(url + MANUAL_BACKUP_ENDPOINTS[service.type], {
        method: "POST",
        headers,
        body: JSON.stringify({ backupId: backup.backupId }),
      });
      if (!response.ok) {
        const err = (await response.json()) as ErrorResult;
        throw new Error(err.message);
      }
      toast.style = Toast.Style.Success;
      toast.title = "Backup complete";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not run backup";
      toast.message = `${error}`;
    }
  }

  async function deleteBackup(backup: Backup) {
    const options: Alert.Options = {
      title: `Delete ${backup.prefix}?`,
      message: "This removes the backup schedule only - files already written to the destination stay there.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete Backup",
      },
    };
    if (!(await confirmAlert(options))) return;

    const toast = await showToast(Toast.Style.Animated, `Deleting ${backup.prefix}…`);
    try {
      const response = await fetch(url + "backup.remove", {
        method: "POST",
        headers,
        body: JSON.stringify({ backupId: backup.backupId }),
      });
      if (!response.ok) {
        const err = (await response.json()) as ErrorResult;
        throw new Error(err.message);
      }
      toast.style = Toast.Style.Success;
      toast.title = `Deleted ${backup.prefix}`;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not delete backup";
      toast.message = `${error}`;
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle={`${displayName} - Backups`}>
      {error ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Could not load backups" description={`${error}`} />
      ) : backups.length === 0 ? (
        <List.EmptyView
          icon={Icon.Cloud}
          title="No Backups"
          description={`${displayName} has no scheduled backups yet.`}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Add Backup"
                target={<BackupForm service={service} onSaved={revalidate} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        backups.map((backup) => (
          <List.Item
            key={backup.backupId}
            icon={{
              source: Icon.Cloud,
              tintColor: backup.enabled === false ? Color.SecondaryText : Color.Green,
            }}
            title={backup.prefix}
            subtitle={backup.schedule}
            accessories={[
              // Which container the backup runs in is the thing worth checking on a Compose stack.
              ...(backup.serviceName ? [{ tag: backup.serviceName, icon: Icon.Box }] : []),
              ...(backup.destination?.name ? [{ tag: backup.destination.name }] : []),
              backup.enabled === false ? { tag: { value: "Disabled", color: Color.SecondaryText } } : {},
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Pencil}
                  title="Edit Backup"
                  target={<BackupForm service={service} initial={backup} onSaved={revalidate} />}
                />
                <Action icon={Icon.Play} title="Run Backup Now" onAction={() => runBackupNow(backup)} />
                <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => revalidate()} />
                <Action.Push
                  icon={Icon.Plus}
                  title="Add Backup"
                  target={<BackupForm service={service} onSaved={revalidate} />}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Backup"
                  style={Action.Style.Destructive}
                  onAction={() => deleteBackup(backup)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

interface BackupFormValues {
  prefix: string;
  schedule: string;
  destinationId: string;
  database: string;
  keepLatestCount: string;
  enabled: boolean;
  containerServiceName: string;
  databaseEngine: string;
}

function BackupForm({ service, initial, onSaved }: { service: BackupService; initial?: Backup; onSaved: () => void }) {
  const { url, headers } = useToken();
  const { pop } = useNavigation();
  const displayName = service.name || service.appName || service.id;
  const isCompose = service.type === "compose";

  const {
    data: destinations,
    isLoading: destinationsLoading,
    error: destinationsError,
    revalidate: revalidateDestinations,
  } = useFetch<Destination[], Destination[]>(url + "destination.all", {
    headers,
    initialData: [],
  });

  const { containers, containersLoading, containersError, retryContainers } = useComposeContainers(
    url,
    headers,
    service.id,
    isCompose,
  );

  const { handleSubmit, itemProps } = useForm<BackupFormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, `Saving ${values.prefix}…`);
      try {
        const body: Record<string, unknown> = {
          schedule: values.schedule.trim(),
          enabled: values.enabled,
          prefix: values.prefix.trim(),
          destinationId: values.destinationId,
          // Dokploy encodes "keep all" as 0, not a missing value - and backup.update's schema
          // requires a number (unlike backup.create, where it's optional), so this must always be
          // sent as one or a save with an empty field fails server-side.
          keepLatestCount: values.keepLatestCount.trim() ? Number(values.keepLatestCount) : 0,
          database: values.database.trim(),
          // A Compose backup still needs to say which engine the picked container runs - Dokploy
          // can't infer that from the compose file, only from what's dumped inside it.
          databaseType: isCompose ? values.databaseEngine : service.type,
          [ID_FIELDS[service.type]]: service.id,
          ...(isCompose ? { backupType: "compose", serviceName: values.containerServiceName } : {}),
          ...(initial ? { backupId: initial.backupId } : {}),
        };

        const response = await fetch(url + (initial ? "backup.update" : "backup.create"), {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const err = (await response.json()) as ErrorResult;
          throw new Error(err.message);
        }
        toast.style = Toast.Style.Success;
        toast.title = initial ? "Saved backup" : "Added backup";
        onSaved();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not save backup";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      prefix: initial?.prefix ?? "",
      schedule: initial?.schedule ?? "0 0 * * *",
      destinationId: initial?.destinationId ?? "",
      database: initial?.database ?? "",
      // Both "never set" and Dokploy's own "keep all" encoding (0) read back as blank here.
      keepLatestCount: initial?.keepLatestCount ? String(initial.keepLatestCount) : "",
      enabled: initial?.enabled ?? true,
      containerServiceName: initial?.serviceName ?? "",
      databaseEngine: initial?.databaseType ?? "",
    },
    validation: {
      prefix: FormValidation.Required,
      schedule: FormValidation.Required,
      destinationId: FormValidation.Required,
      database: FormValidation.Required,
      keepLatestCount: (value) => {
        if (!value) return;
        const count = Number(value);
        if (!Number.isInteger(count) || count < 0) return "Enter a whole number of 0 or more";
      },
      containerServiceName: (value) => {
        if (isCompose && !value) return "Select a container";
      },
      databaseEngine: (value) => {
        if (isCompose && !value) return "Select which database engine this container runs";
      },
    },
  });

  return (
    <Form
      isLoading={destinationsLoading || containersLoading}
      navigationTitle={`${displayName} - ${initial ? "Edit" : "Add"} Backup`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title={initial ? "Save" : "Add Backup"} onSubmit={handleSubmit} />
          <Action.Push
            icon={Icon.Plus}
            title="Add Destination"
            target={<CreateDestination onCreate={revalidateDestinations} />}
          />
          {isCompose && containersError && (
            <Action icon={Icon.ArrowClockwise} title="Retry Loading Containers" onAction={() => retryContainers()} />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField title="Prefix" placeholder="my-app-backup" {...itemProps.prefix} />
      <Form.TextField
        title="Schedule"
        placeholder="0 0 * * *"
        info="A cron expression - Dokploy runs the backup on this schedule."
        {...itemProps.schedule}
      />
      {destinationsError ? (
        <Form.Description title="Destination" text={`Could not load destinations: ${destinationsError}`} />
      ) : destinations.length === 0 ? (
        <Form.Description
          title="Destination"
          text="No S3 destinations yet - use the Add Destination action below to create one."
        />
      ) : (
        <Form.Dropdown title="Destination" {...itemProps.destinationId}>
          {destinations.map((destination) => (
            <Form.Dropdown.Item
              key={destination.destinationId}
              title={destination.name}
              value={destination.destinationId}
            />
          ))}
        </Form.Dropdown>
      )}
      {isCompose &&
        (containersError ? (
          <Form.Description title="Container" text={`Could not load containers: ${containersError}`} />
        ) : (
          <Form.Dropdown
            title="Container"
            info="Which container in the stack to back up."
            {...itemProps.containerServiceName}
          >
            {containers?.map((name) => <Form.Dropdown.Item key={name} title={name} value={name} />)}
          </Form.Dropdown>
        ))}
      {isCompose && (
        <Form.Dropdown
          title="Database Engine"
          info="Which database engine the picked container runs - Dokploy needs this to know how to dump it."
          {...itemProps.databaseEngine}
        >
          {DATABASE_ENGINES.map((engine) => (
            <Form.Dropdown.Item key={engine.value} title={engine.title} value={engine.value} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField
        title="Database Name"
        placeholder="my_database"
        info="The database name inside the engine to dump."
        {...itemProps.database}
      />
      <Form.TextField
        title="Keep Latest Count"
        placeholder="Keep all"
        info="How many recent backups to retain at the destination. Leave blank to keep all of them."
        {...itemProps.keepLatestCount}
      />
      <Form.Checkbox title="Enabled" label="Run this backup on its schedule" {...itemProps.enabled} />
    </Form>
  );
}
