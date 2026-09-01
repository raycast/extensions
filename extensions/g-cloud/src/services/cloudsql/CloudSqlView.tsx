import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Color,
  Detail,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  listCloudSqlInstances,
  listCloudSqlDatabases,
  listCloudSqlUsers,
  listCloudSqlBackupRuns,
  createCloudSqlBackupRun,
  CloudSqlInstance,
  CloudSqlDatabase,
  CloudSqlUser,
  CloudSqlBackupRun,
} from "../../utils/gcpApi";
import { ServiceViewBar } from "../../utils/ServiceViewBar";
import { initializeQuickLink } from "../../utils/QuickLinks";
import { ApiErrorView } from "../../components/ApiErrorView";
import { CloudShellAction } from "../../components/CloudShellAction";
import { friendlyErrorMessage } from "../../utils/errorMessages";
import { useStreamerMode } from "../../utils/useStreamerMode";
import { maskIPIfEnabled, maskEmailIfEnabled } from "../../utils/maskSensitiveData";

const MAINTENANCE_DAYS = ["Any", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface StatusInfo {
  icon: Icon;
  color: Color;
  text: string;
}

/**
 * A stopped instance still reports state RUNNABLE; the stop is expressed as
 * settings.activationPolicy NEVER, which is what gcloud's own STATUS column reflects.
 */
function isInstanceStopped(instance: CloudSqlInstance): boolean {
  if (instance.settings?.activationPolicy === "NEVER") return true;
  return instance.state !== undefined && instance.state !== "RUNNABLE";
}

function getInstanceStatus(instance: CloudSqlInstance): StatusInfo {
  if (instance.state === "RUNNABLE" && instance.settings?.activationPolicy === "NEVER") {
    return { icon: Icon.Stop, color: Color.SecondaryText, text: "Stopped" };
  }

  switch (instance.state) {
    case "RUNNABLE":
      return { icon: Icon.CheckCircle, color: Color.Green, text: "Running" };
    case "STOPPED":
      return { icon: Icon.Stop, color: Color.SecondaryText, text: "Stopped" };
    case "PENDING_CREATE":
      return { icon: Icon.Clock, color: Color.Yellow, text: "Creating" };
    case "PENDING_DELETE":
      return { icon: Icon.Clock, color: Color.Yellow, text: "Deleting" };
    case "MAINTENANCE":
      return { icon: Icon.Clock, color: Color.Yellow, text: "Maintenance" };
    case "FAILED":
      return { icon: Icon.XMarkCircle, color: Color.Red, text: "Failed" };
    case "SUSPENDED":
      return { icon: Icon.XMarkCircle, color: Color.Red, text: "Suspended" };
    default:
      return { icon: Icon.Circle, color: Color.SecondaryText, text: instance.state || "Unknown" };
  }
}

/**
 * Turns MYSQL_5_7 / POSTGRES_18 / SQLSERVER_2019_STANDARD into "MySQL 5.7", "PostgreSQL 18",
 * "SQL Server 2019 Standard". Falls back to the raw value for engines we do not know about.
 */
function formatDatabaseVersion(version?: string): string {
  if (!version) return "Unknown";

  const engines: Array<[string, string]> = [
    ["POSTGRES_", "PostgreSQL "],
    ["MYSQL_", "MySQL "],
    ["SQLSERVER_", "SQL Server "],
  ];

  for (const [prefix, label] of engines) {
    if (version.startsWith(prefix)) {
      // Version numbers are underscore-separated (MYSQL_5_7 -> 5.7); anything after the
      // leading numeric run is an edition name (SQLSERVER_2019_STANDARD -> 2019 Standard).
      const parts = version.slice(prefix.length).split("_");
      const versionEnd = parts.findIndex((part) => !/^\d+$/.test(part));
      const numericParts = versionEnd === -1 ? parts : parts.slice(0, versionEnd);
      const edition =
        versionEnd === -1
          ? ""
          : parts
              .slice(versionEnd)
              .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
              .join(" ");
      return `${label}${numericParts.join(".")}${edition ? ` ${edition}` : ""}`;
    }
  }

  return version;
}

function getPrimaryIp(instance: CloudSqlInstance): string | undefined {
  return instance.ipAddresses?.find((ip) => ip.type === "PRIMARY")?.ipAddress;
}

function formatTimestamp(value?: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

interface InstanceSectionProps {
  instance: CloudSqlInstance;
  projectId: string;
  gcloudPath: string;
  /** Omitted when already on the detail view, which has nowhere further to go. */
  onViewDetails?: () => void;
}

/** Shared by the instance list and the instance detail view so both offer the same actions. */
function InstanceNavigationSection({ instance, projectId, gcloudPath, onViewDetails }: InstanceSectionProps) {
  const { push } = useNavigation();

  return (
    <ActionPanel.Section title="Instance">
      {onViewDetails && <Action title="View Details" icon={Icon.Eye} onAction={onViewDetails} />}
      <Action
        title="View Databases"
        icon={Icon.List}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={() =>
          push(
            <DatabasesView
              projectId={projectId}
              gcloudPath={gcloudPath}
              instanceName={instance.name}
              instanceStopped={isInstanceStopped(instance)}
            />,
          )
        }
      />
      <Action
        title="View Users"
        icon={Icon.Person}
        shortcut={{ modifiers: ["cmd"], key: "u" }}
        onAction={() =>
          push(
            <UsersView
              projectId={projectId}
              gcloudPath={gcloudPath}
              instanceName={instance.name}
              instanceStopped={isInstanceStopped(instance)}
            />,
          )
        }
      />
      <Action
        title="View Backups"
        icon={Icon.Clock}
        shortcut={{ modifiers: ["cmd"], key: "b" }}
        onAction={() =>
          push(<BackupsView projectId={projectId} gcloudPath={gcloudPath} instanceName={instance.name} />)
        }
      />
      <Action.OpenInBrowser
        title="Open in Console"
        url={`https://console.cloud.google.com/sql/instances/${instance.name}/overview?project=${projectId}`}
        shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
      />
    </ActionPanel.Section>
  );
}

function InstanceCopySection({ instance, projectId }: { instance: CloudSqlInstance; projectId: string }) {
  const primaryIp = getPrimaryIp(instance);

  return (
    <ActionPanel.Section title="Copy">
      <Action.CopyToClipboard
        title="Copy Instance Name"
        content={instance.name}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      {instance.connectionName && (
        <Action.CopyToClipboard
          title="Copy Connection Name"
          content={instance.connectionName}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      )}
      {primaryIp && <Action.CopyToClipboard title="Copy Public IP" content={primaryIp} />}
      <Action.CopyToClipboard
        title="Copy Connect Command"
        content={`gcloud sql connect ${instance.name} --project=${projectId}`}
      />
    </ActionPanel.Section>
  );
}

interface CloudSqlViewProps {
  projectId: string;
  gcloudPath: string;
}

export default function CloudSqlView({ projectId, gcloudPath }: CloudSqlViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [instances, setInstances] = useState<CloudSqlInstance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();
  const { isEnabled: isStreamerMode } = useStreamerMode();

  useEffect(() => {
    initializeQuickLink(projectId);
    fetchInstances();
  }, []);

  async function fetchInstances() {
    setIsLoading(true);
    setError(null);

    try {
      const instanceList = await listCloudSqlInstances(gcloudPath, projectId);
      setInstances(instanceList);

      if (instanceList.length === 0) {
        showToast({
          style: Toast.Style.Success,
          title: "No Cloud SQL instances found",
          message: "Create an instance to get started",
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Instances loaded",
          message: `Found ${instanceList.length} instances`,
        });
      }
    } catch (err) {
      console.error("Error fetching Cloud SQL instances:", err);
      const friendly = friendlyErrorMessage(err, "Failed to fetch instances");
      setError(friendly.message);
    } finally {
      setIsLoading(false);
    }
  }

  function viewInstanceDetails(instance: CloudSqlInstance) {
    const status = getInstanceStatus(instance);
    const settings = instance.settings;
    const backup = settings?.backupConfiguration;
    const maintenance = settings?.maintenanceWindow;
    const primaryIp = getPrimaryIp(instance);

    const ipRows =
      instance.ipAddresses && instance.ipAddresses.length > 0
        ? instance.ipAddresses
            .map((ip) => `- **${ip.type}:** \`${maskIPIfEnabled(ip.ipAddress, isStreamerMode)}\``)
            .join("\n")
        : "- No IP addresses assigned";

    const authorizedNetworks = settings?.ipConfiguration?.authorizedNetworks;
    const authorizedRows =
      authorizedNetworks && authorizedNetworks.length > 0
        ? authorizedNetworks
            .map((net) => `- ${net.name ? `**${net.name}:** ` : ""}\`${maskIPIfEnabled(net.value, isStreamerMode)}\``)
            .join("\n")
        : "- None";

    const markdown = `# ${instance.name}

## Overview
- **Status:** ${status.text}
- **Engine:** ${formatDatabaseVersion(instance.databaseVersion)}${
      instance.databaseInstalledVersion && instance.databaseInstalledVersion !== instance.databaseVersion
        ? ` (running ${formatDatabaseVersion(instance.databaseInstalledVersion)})`
        : ""
    }
- **Region:** ${instance.region || "—"}${instance.gceZone ? ` (${instance.gceZone})` : ""}
- **Availability:** ${settings?.availabilityType === "REGIONAL" ? "Regional (HA)" : "Zonal"}${
      instance.secondaryGceZone ? ` · secondary ${instance.secondaryGceZone}` : ""
    }
- **Tier:** ${settings?.tier || "—"}${settings?.edition ? ` · ${settings.edition}` : ""}
- **Storage:** ${settings?.dataDiskSizeGb ? `${settings.dataDiskSizeGb} GB` : "—"}${
      settings?.dataDiskType ? ` (${settings.dataDiskType})` : ""
    }
- **Created:** ${formatTimestamp(instance.createTime)}
- **Deletion protection:** ${settings?.deletionProtectionEnabled ? "Enabled" : "Disabled"}

## Connectivity
- **Connection name:** \`${instance.connectionName || "—"}\`
- **Public IP:** ${settings?.ipConfiguration?.ipv4Enabled ? "Enabled" : "Disabled"}
- **Private network:** ${settings?.ipConfiguration?.privateNetwork ? `\`${settings.ipConfiguration.privateNetwork}\`` : "None"}
- **SSL mode:** ${settings?.ipConfiguration?.sslMode || (settings?.ipConfiguration?.requireSsl ? "Required" : "—")}

### IP addresses
${ipRows}

### Authorized networks
${authorizedRows}

## Backups
- **Automated backups:** ${backup?.enabled ? "Enabled" : "Disabled"}
- **Backup window:** ${backup?.startTime ? `${backup.startTime} UTC` : "—"}
- **Backup location:** ${backup?.location || "—"}
- **Retained backups:** ${backup?.backupRetentionSettings?.retainedBackups ?? "—"}
- **Point-in-time recovery:** ${backup?.pointInTimeRecoveryEnabled ? "Enabled" : "Disabled"}${
      backup?.transactionLogRetentionDays ? ` · ${backup.transactionLogRetentionDays}d transaction logs` : ""
    }

## Maintenance
- **Window:** ${
      maintenance?.day !== undefined || maintenance?.hour !== undefined
        ? `${MAINTENANCE_DAYS[maintenance?.day ?? 0]} at ${String(maintenance?.hour ?? 0).padStart(2, "0")}:00 UTC`
        : "Any window"
    }
- **Update track:** ${maintenance?.updateTrack || "—"}

${
  instance.serviceAccountEmailAddress
    ? `## Service account
\`${maskEmailIfEnabled(instance.serviceAccountEmailAddress, isStreamerMode)}\``
    : ""
}
${
  primaryIp
    ? `
> Connect with: \`gcloud sql connect ${instance.name} --project=${projectId}\``
    : ""
}
`;

    push(
      <Detail
        markdown={markdown}
        navigationTitle={instance.name}
        actions={
          <ActionPanel>
            <InstanceNavigationSection instance={instance} projectId={projectId} gcloudPath={gcloudPath} />
            <InstanceCopySection instance={instance} projectId={projectId} />
            <ActionPanel.Section title="Cloud Shell">
              <CloudShellAction projectId={projectId} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />,
    );
  }

  if (error) {
    return (
      <List>
        <ApiErrorView error={error} projectId={projectId} apiName="sqladmin" onRetry={fetchInstances} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Cloud SQL instances..."
      navigationTitle={`Cloud SQL - ${projectId}`}
      searchBarAccessory={<ServiceViewBar projectId={projectId} gcloudPath={gcloudPath} serviceName="cloudsql" />}
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.RotateClockwise} onAction={fetchInstances} />
          <Action.OpenInBrowser
            title="Open Cloud SQL Console"
            url={`https://console.cloud.google.com/sql/instances?project=${projectId}`}
          />
          <ActionPanel.Section title="Cloud Shell">
            <CloudShellAction projectId={projectId} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {instances.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Cloud SQL Instances"
          description="Create an instance to get started"
          icon={{ source: Icon.HardDrive }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Cloud SQL Console"
                url={`https://console.cloud.google.com/sql/instances?project=${projectId}`}
              />
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={fetchInstances} />
              <ActionPanel.Section title="Cloud Shell">
                <CloudShellAction projectId={projectId} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ) : (
        instances.map((instance) => {
          const status = getInstanceStatus(instance);
          const isHighAvailability = instance.settings?.availabilityType === "REGIONAL";

          return (
            <List.Item
              key={instance.name}
              title={instance.name}
              subtitle={formatDatabaseVersion(instance.databaseVersion)}
              icon={{ source: Icon.HardDrive, tintColor: status.color }}
              accessories={[
                ...(isHighAvailability ? [{ icon: Icon.Layers, tooltip: "Regional (HA)" }] : []),
                ...(instance.settings?.tier ? [{ text: instance.settings.tier, tooltip: "Machine type" }] : []),
                ...(instance.region ? [{ text: instance.region }] : []),
                { tag: { value: status.text, color: status.color } },
              ]}
              actions={
                <ActionPanel>
                  <InstanceNavigationSection
                    instance={instance}
                    projectId={projectId}
                    gcloudPath={gcloudPath}
                    onViewDetails={() => viewInstanceDetails(instance)}
                  />
                  <InstanceCopySection instance={instance} projectId={projectId} />
                  <ActionPanel.Section>
                    <Action title="Refresh" icon={Icon.RotateClockwise} onAction={fetchInstances} />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Cloud Shell">
                    <CloudShellAction projectId={projectId} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

interface SubViewProps {
  projectId: string;
  gcloudPath: string;
  instanceName: string;
  /** Databases and users can only be listed while the instance is actually running. */
  instanceStopped?: boolean;
}

/** The API rejects databases/users listings on a stopped instance with a 400. */
function isInstanceNotRunningError(message: string): boolean {
  return message.toLowerCase().includes("instance is not running");
}

/**
 * A stopped instance is an ordinary state, not a failure, so it gets an explanation
 * and a way forward rather than the generic API error screen.
 */
function InstanceStoppedView({
  instanceName,
  projectId,
  resource,
}: {
  instanceName: string;
  projectId: string;
  resource: string;
}) {
  return (
    <List.EmptyView
      title="Instance Is Stopped"
      description={`Cloud SQL cannot list ${resource} while "${instanceName}" is stopped. Start the instance to see them.`}
      icon={{ source: Icon.Stop, tintColor: Color.SecondaryText }}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Console"
            url={`https://console.cloud.google.com/sql/instances/${instanceName}/overview?project=${projectId}`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          />
          <Action.CopyToClipboard
            title="Copy Start Command"
            content={`gcloud sql instances patch ${instanceName} --project=${projectId} --activation-policy=ALWAYS`}
          />
        </ActionPanel>
      }
    />
  );
}

function DatabasesView({ projectId, gcloudPath, instanceName, instanceStopped }: SubViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [databases, setDatabases] = useState<CloudSqlDatabase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isStopped = instanceStopped === true;

  useEffect(() => {
    // Skip the request entirely when we already know it will be rejected.
    if (isStopped) {
      setIsLoading(false);
      return;
    }
    fetchDatabases();
  }, []);

  async function fetchDatabases() {
    setIsLoading(true);
    setError(null);

    try {
      const databaseList = await listCloudSqlDatabases(gcloudPath, projectId, instanceName);
      setDatabases(databaseList);
    } catch (err) {
      console.error("Error fetching databases:", err);
      const friendly = friendlyErrorMessage(err, "Failed to fetch databases");
      setError(friendly.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isStopped || (error && isInstanceNotRunningError(error))) {
    return (
      <List navigationTitle={`Databases - ${instanceName}`}>
        <InstanceStoppedView instanceName={instanceName} projectId={projectId} resource="databases" />
      </List>
    );
  }

  if (error) {
    return (
      <List>
        <ApiErrorView error={error} projectId={projectId} apiName="sqladmin" onRetry={fetchDatabases} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search databases..."
      navigationTitle={`Databases - ${instanceName}`}
    >
      {databases.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Databases"
          description="This instance has no databases"
          icon={{ source: Icon.List }}
        />
      ) : (
        databases.map((database) => (
          <List.Item
            key={database.name}
            title={database.name}
            icon={{ source: Icon.List, tintColor: Color.Magenta }}
            accessories={[
              ...(database.charset ? [{ text: database.charset }] : []),
              ...(database.collation ? [{ text: database.collation, tooltip: "Collation" }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Database Name" content={database.name} />
                <Action.OpenInBrowser
                  title="Open in Console"
                  url={`https://console.cloud.google.com/sql/instances/${instanceName}/databases?project=${projectId}`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                />
                <Action title="Refresh" icon={Icon.RotateClockwise} onAction={fetchDatabases} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function UsersView({ projectId, gcloudPath, instanceName, instanceStopped }: SubViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<CloudSqlUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { isEnabled: isStreamerMode } = useStreamerMode();
  const isStopped = instanceStopped === true;

  useEffect(() => {
    // Skip the request entirely when we already know it will be rejected.
    if (isStopped) {
      setIsLoading(false);
      return;
    }
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setIsLoading(true);
    setError(null);

    try {
      const userList = await listCloudSqlUsers(gcloudPath, projectId, instanceName);
      setUsers(userList);
    } catch (err) {
      console.error("Error fetching users:", err);
      const friendly = friendlyErrorMessage(err, "Failed to fetch users");
      setError(friendly.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isStopped || (error && isInstanceNotRunningError(error))) {
    return (
      <List navigationTitle={`Users - ${instanceName}`}>
        <InstanceStoppedView instanceName={instanceName} projectId={projectId} resource="users" />
      </List>
    );
  }

  if (error) {
    return (
      <List>
        <ApiErrorView error={error} projectId={projectId} apiName="sqladmin" onRetry={fetchUsers} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search users..." navigationTitle={`Users - ${instanceName}`}>
      {users.length === 0 && !isLoading ? (
        <List.EmptyView title="No Users" description="This instance has no users" icon={{ source: Icon.Person }} />
      ) : (
        users.map((user) => {
          const isIamUser = Boolean(user.iamStatus) || user.type?.startsWith("CLOUD_IAM");
          const displayName = user.name.includes("@")
            ? maskEmailIfEnabled(user.name, isStreamerMode)
            : maskIPIfEnabled(user.name, isStreamerMode);

          return (
            <List.Item
              key={`${user.name}@${user.host || "%"}`}
              title={displayName}
              subtitle={user.host ? `host: ${user.host}` : undefined}
              icon={{ source: isIamUser ? Icon.Key : Icon.Person, tintColor: isIamUser ? Color.Yellow : Color.Blue }}
              accessories={isIamUser ? [{ tag: { value: "IAM", color: Color.Yellow } }] : []}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy User Name" content={user.name} />
                  <Action.OpenInBrowser
                    title="Open in Console"
                    url={`https://console.cloud.google.com/sql/instances/${instanceName}/users?project=${projectId}`}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                  />
                  <Action title="Refresh" icon={Icon.RotateClockwise} onAction={fetchUsers} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function getBackupStatus(backup: CloudSqlBackupRun): StatusInfo {
  switch (backup.status) {
    case "SUCCESSFUL":
      return { icon: Icon.CheckCircle, color: Color.Green, text: "Successful" };
    case "RUNNING":
      return { icon: Icon.Clock, color: Color.Yellow, text: "Running" };
    case "ENQUEUED":
      return { icon: Icon.Clock, color: Color.Yellow, text: "Enqueued" };
    case "PENDING":
      return { icon: Icon.Clock, color: Color.Yellow, text: "Pending" };
    case "FAILED":
      return { icon: Icon.XMarkCircle, color: Color.Red, text: "Failed" };
    case "DELETED":
      return { icon: Icon.Circle, color: Color.SecondaryText, text: "Deleted" };
    default:
      return { icon: Icon.Circle, color: Color.SecondaryText, text: backup.status || "Unknown" };
  }
}

function BackupsView({ projectId, gcloudPath, instanceName }: SubViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [backups, setBackups] = useState<CloudSqlBackupRun[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBackups();
  }, []);

  async function fetchBackups() {
    setIsLoading(true);
    setError(null);

    try {
      const backupList = await listCloudSqlBackupRuns(gcloudPath, projectId, instanceName);
      setBackups(backupList);
    } catch (err) {
      console.error("Error fetching backups:", err);
      const friendly = friendlyErrorMessage(err, "Failed to fetch backups");
      setError(friendly.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateBackup() {
    const confirmed = await confirmAlert({
      title: "Create On-Demand Backup",
      message: `Start a backup of "${instanceName}" now? On-demand backups are retained until you delete them and are billed as storage.`,
      primaryAction: {
        title: "Create Backup",
        style: Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting backup...",
      message: instanceName,
    });

    try {
      await createCloudSqlBackupRun(gcloudPath, projectId, instanceName, "On-demand backup from Raycast");
      toast.style = Toast.Style.Success;
      toast.title = "Backup started";
      toast.message = "It may take a few minutes to complete";
      fetchBackups();
    } catch (err) {
      console.error("Error creating backup:", err);
      const friendly = friendlyErrorMessage(err, "Failed to create backup");
      toast.style = Toast.Style.Failure;
      toast.title = friendly.title;
      toast.message = friendly.message;
    }
  }

  if (error) {
    return (
      <List>
        <ApiErrorView error={error} projectId={projectId} apiName="sqladmin" onRetry={fetchBackups} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search backups..."
      navigationTitle={`Backups - ${instanceName}`}
      actions={
        <ActionPanel>
          <Action
            title="Create Backup"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={handleCreateBackup}
          />
          <Action title="Refresh" icon={Icon.RotateClockwise} onAction={fetchBackups} />
        </ActionPanel>
      }
    >
      {backups.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Backups"
          description="This instance has no backup runs yet"
          icon={{ source: Icon.Clock }}
          actions={
            <ActionPanel>
              <Action
                title="Create Backup"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={handleCreateBackup}
              />
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={fetchBackups} />
            </ActionPanel>
          }
        />
      ) : (
        backups.map((backup) => {
          const status = getBackupStatus(backup);
          const isOnDemand = backup.type === "ON_DEMAND";

          return (
            <List.Item
              key={backup.id}
              title={formatTimestamp(backup.startTime)}
              subtitle={backup.description || undefined}
              icon={{ source: Icon.Clock, tintColor: status.color }}
              accessories={[
                ...(backup.location ? [{ text: backup.location }] : []),
                {
                  tag: { value: isOnDemand ? "On-demand" : "Automated", color: isOnDemand ? Color.Blue : Color.Purple },
                },
                { tag: { value: status.text, color: status.color } },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Create Backup"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={handleCreateBackup}
                  />
                  <Action.CopyToClipboard title="Copy Backup ID" content={backup.id} />
                  <Action.OpenInBrowser
                    title="Open in Console"
                    url={`https://console.cloud.google.com/sql/instances/${instanceName}/backups?project=${projectId}`}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                  />
                  <Action title="Refresh" icon={Icon.RotateClockwise} onAction={fetchBackups} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
