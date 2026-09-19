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
import { Backup, Destination, ErrorResult } from "./interfaces";

// Redis has no `databaseType` value in Dokploy's backup API, and libsql isn't a kind this
// extension manages at all - only these four take a scheduled backup.
export type BackupableKind = "postgres" | "mariadb" | "mysql" | "mongo";
const ID_FIELDS: Record<BackupableKind, string> = {
  postgres: "postgresId",
  mariadb: "mariadbId",
  mysql: "mysqlId",
  mongo: "mongoId",
};
const MANUAL_BACKUP_ENDPOINTS: Record<BackupableKind, string> = {
  postgres: "backup.manualBackupPostgres",
  mariadb: "backup.manualBackupMariadb",
  mysql: "backup.manualBackupMySql",
  mongo: "backup.manualBackupMongo",
};

interface BackupService {
  id: string;
  type: BackupableKind;
  name: string;
  appName?: string;
}

/** The scheduled backups for one database. */
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
    // `backups` is a relation embedded in `<kind>.one` - there's no endpoint scoped to just a
    // database's own backups, unlike `overview.backups` which is an org-wide run-history log (no
    // `backupId`, one row per past run) rather than a list of schedule configs.
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
}

function BackupForm({ service, initial, onSaved }: { service: BackupService; initial?: Backup; onSaved: () => void }) {
  const { url, headers } = useToken();
  const { pop } = useNavigation();
  const displayName = service.name || service.appName || service.id;

  const {
    data: destinations,
    isLoading: destinationsLoading,
    error: destinationsError,
  } = useFetch<Destination[], Destination[]>(url + "destination.all", {
    headers,
    initialData: [],
  });

  const { handleSubmit, itemProps } = useForm<BackupFormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, `Saving ${values.prefix}…`);
      try {
        const body: Record<string, unknown> = {
          schedule: values.schedule.trim(),
          enabled: values.enabled,
          prefix: values.prefix.trim(),
          destinationId: values.destinationId,
          keepLatestCount: values.keepLatestCount.trim() ? Number(values.keepLatestCount) : undefined,
          database: values.database.trim(),
          databaseType: service.type,
          [ID_FIELDS[service.type]]: service.id,
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
      keepLatestCount: initial?.keepLatestCount != null ? String(initial.keepLatestCount) : "",
      enabled: initial?.enabled ?? true,
    },
    validation: {
      prefix: FormValidation.Required,
      schedule: FormValidation.Required,
      destinationId: FormValidation.Required,
      database: FormValidation.Required,
      keepLatestCount: (value) => {
        if (!value) return;
        const count = Number(value);
        if (!Number.isInteger(count) || count < 1) return "Enter a whole number of 1 or more";
      },
    },
  });

  return (
    <Form
      isLoading={destinationsLoading}
      navigationTitle={`${displayName} - ${initial ? "Edit" : "Add"} Backup`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title={initial ? "Save" : "Add Backup"} onSubmit={handleSubmit} />
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
          text="Add an S3 destination first (Destinations command) to pick one here."
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
