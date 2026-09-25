import {
  Alert,
  confirmAlert,
  showToast,
  Toast,
  Icon,
  List,
  ActionPanel,
  Action,
  Form,
  useNavigation,
} from "@raycast/api";
import { useFetch, useForm, FormValidation } from "@raycast/utils";
import { type Instance, useToken, tokenForInstance } from "./instances";
import { Server, Service, ErrorResult, DatabaseKind, Project } from "./interfaces";
import ServiceLogs from "./service-logs";
import DeploymentHistory from "./deployment-history";
import ServiceEnv from "./service-env";
import ServiceDomains from "./service-domains";
import ServiceBackups, { BackupableKind } from "./service-backups";
import ServiceSchedules from "./service-schedules";
import Templates from "./templates";
import { DatabaseActions } from "./database-actions";
import { ACTION_ICONS, ACTION_LABELS, SERVICE_ACTIONS, runServiceAction, statusAccessory } from "./service-actions";
import type { ServiceScope } from "./utils";
import { getTotalServices, isModernProject } from "./utils";

const DATABASE_KINDS: DatabaseKind[] = ["mariadb", "mongo", "mysql", "postgres", "redis"];
// Redis has no `databaseType` value in Dokploy's backup API - only these four take one.
const BACKUPABLE_KINDS: BackupableKind[] = ["mariadb", "mongo", "mysql", "postgres"];

export default function Services({
  environment,
  revalidate,
  instance,
}: {
  environment: ServiceScope;
  /**
   * Refetches the parent's own project list (Projects/Environments), so their subtitles
   * ("N services"/"N environments") stay in sync too. Services no longer depends on this for its
   * own rows - see the `project.one` fetch below - so it's optional and only wired for that.
   */
  revalidate?: () => void;
  /** The instance this screen was opened for, when a caller (e.g. Projects' own instance dropdown) knows it explicitly - falls back to the shared active token otherwise, same as `useToken()` alone did before. */
  instance?: Instance;
}) {
  const activeToken = useToken();
  const { url, headers } = instance ? tokenForInstance(instance) : activeToken;

  // `environment` is a snapshot from whenever this screen was pushed - the parent's own
  // `revalidate` refetches its own list, but that refetch never reaches an already-pushed Services
  // screen since props don't change on their own. So Services fetches its own copy of the project
  // here and renders from that instead, which makes its own `refresh()` (below) actually update
  // what's on screen after Create/Delete.
  const {
    data: project,
    revalidate: revalidateProject,
    isLoading: isProjectLoading,
  } = useFetch<Project, Project | undefined>(`${url}project.one?projectId=${environment.projectId}`, {
    headers,
  });

  const scope: ServiceScope =
    (project
      ? isModernProject(project)
        ? project.environments.find((e) => e.environmentId === environment.environmentId)
        : project
      : undefined) ?? environment;

  function refresh() {
    revalidateProject();
    revalidate?.();
  }

  interface GroupedService extends Service {
    type: string;
    id: string;
    status: "idle" | "done";
  }

  const services: GroupedService[] = [
    ...scope.applications.map((a) => ({
      ...a,
      type: "application",
      id: a.applicationId,
      status: a.applicationStatus,
    })),
    ...scope.mariadb.map((m) => ({ ...m, type: "mariadb", id: m.mariadbId, status: m.applicationStatus })),
    ...scope.mongo.map((m) => ({ ...m, type: "mongo", id: m.mongoId, status: m.applicationStatus })),
    ...scope.mysql.map((m) => ({ ...m, type: "mysql", id: m.mysqlId, status: m.applicationStatus })),
    ...scope.postgres.map((p) => ({ ...p, type: "postgres", id: p.postgresId, status: p.applicationStatus })),
    ...scope.redis.map((r) => ({ ...r, type: "redis", id: r.redisId, status: r.applicationStatus })),
    ...scope.compose.map((c) => ({ ...c, type: "compose", id: c.composeId, status: c.composeStatus })),
  ];

  async function deleteService({ id, name, type }: GroupedService) {
    const options: Alert.Options = {
      title: "Are you absolutely sure?",
      message: "This action cannot be undone. This will permanently delete the service.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Confirm",
      },
    };
    if (await confirmAlert(options)) {
      const toast = await showToast(Toast.Style.Animated, "Deleting service", name);
      let body: Record<string, string> = {};
      let endpoint = "";
      switch (type) {
        case "application":
          body = { applicationId: id };
          endpoint = "application.delete";
          break;
        case "mariadb":
          body = { mariadbId: id };
          endpoint = "mariadb.remove";
          break;
        case "mysql":
          body = { mysqlId: id };
          endpoint = "mysql.remove";
          break;
        case "postgres":
          body = { postgresId: id };
          endpoint = "postgres.remove";
          break;
        case "redis":
          body = { redisId: id };
          endpoint = "redis.remove";
          break;
        case "compose":
          body = { composeId: id };
          endpoint = "compose.delete";
          break;
      }
      try {
        const response = await fetch(url + endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const err = (await response.json()) as ErrorResult;
          throw new Error(err.message);
        }
        toast.style = Toast.Style.Success;
        toast.title = "Deleted service";
        // Same live-status-update mechanism the lifecycle actions above already use - unlike
        // Create, delete never navigates anywhere, so there's no unmount race to work around; it
        // just needed to actually call refresh() instead of popToRoot(), which exited the whole
        // screen and made the list look stale until Raycast was fully restarted.
        refresh();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not delete service";
        toast.message = `${error}`;
      }
    }
  }

  const SERVICE_ICONS: Record<GroupedService["type"], string> = {
    application: Icon.Globe,
    compose: "circuit-board.svg",
    mariadb: "mariadb.svg",
    mongo: "mongo.svg",
    mysql: "mysql.svg",
    postgres: "postgres.svg",
    redis: "redis.svg",
  };

  const totalServices = getTotalServices(scope);

  return (
    <List navigationTitle="Services" isLoading={isProjectLoading} isShowingDetail={totalServices > 0}>
      {!totalServices ? (
        <List.EmptyView
          icon="folder-input.svg"
          title="No services added yet. Go to Create Service."
          actions={
            <ActionPanel>
              <ActionPanel.Submenu icon={Icon.Plus} title="Create">
                <Action.Push
                  icon="folder-input.svg"
                  title="Application"
                  target={<CreateApplication environment={scope} instance={instance} />}
                  onPop={() => refresh()}
                />
                <Action.Push
                  icon="database.svg"
                  title="Database"
                  target={<CreateDatabase environment={scope} instance={instance} />}
                  onPop={() => refresh()}
                />
                {scope.environmentId && (
                  <Action.Push
                    icon={Icon.Box}
                    title="From Template"
                    target={<Templates environmentId={scope.environmentId} />}
                    onPop={() => refresh()}
                  />
                )}
              </ActionPanel.Submenu>
            </ActionPanel>
          }
        />
      ) : (
        services.map((service) => (
          <List.Item
            key={service.id}
            icon={SERVICE_ICONS[service.type]}
            title={service.name}
            accessories={[statusAccessory(service.status)]}
            detail={
              <List.Item.Detail
                markdown={service.description}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Name" text={service.name} />
                    <List.Item.Detail.Metadata.Label title="Application Name" text={service.appName} />
                    <List.Item.Detail.Metadata.Label title="Created" text={service.createdAt} />
                    <List.Item.Detail.Metadata.Label
                      title="Type"
                      icon={SERVICE_ICONS[service.type]}
                      text={service.type}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Submenu icon={Icon.Plus} title="Create">
                  <Action.Push
                    icon="folder-input.svg"
                    title="Application"
                    target={<CreateApplication environment={scope} instance={instance} />}
                    onPop={() => refresh()}
                  />
                  <Action.Push
                    icon="database.svg"
                    title="Database"
                    target={<CreateDatabase environment={scope} instance={instance} />}
                    onPop={() => refresh()}
                  />
                  {scope.environmentId && (
                    <Action.Push
                      icon={Icon.Box}
                      title="From Template"
                      target={<Templates environmentId={scope.environmentId} />}
                      onPop={() => refresh()}
                    />
                  )}
                </ActionPanel.Submenu>
                <ActionPanel.Section title="Actions">
                  {SERVICE_ACTIONS[service.type].map((action) => (
                    <Action
                      key={action}
                      icon={ACTION_ICONS[action]}
                      title={ACTION_LABELS[action]}
                      style={action === "stop" ? Action.Style.Destructive : undefined}
                      onAction={() => runServiceAction(url, headers, service, action, refresh)}
                    />
                  ))}
                  <Action.Push icon={Icon.Terminal} title="View Logs" target={<ServiceLogs service={service} />} />
                  {(service.type === "application" || service.type === "compose") && (
                    <Action.Push
                      icon={Icon.List}
                      title="View Deployments"
                      target={<DeploymentHistory service={{ ...service, type: service.type }} />}
                    />
                  )}
                  <Action.Push
                    icon={Icon.LockUnlocked}
                    title="View Environment"
                    target={<ServiceEnv service={service} />}
                  />
                  {(service.type === "application" || service.type === "compose") && (
                    <Action.Push
                      icon={Icon.Globe}
                      title="View Domains"
                      target={<ServiceDomains service={{ ...service, type: service.type }} />}
                    />
                  )}
                  {(BACKUPABLE_KINDS.includes(service.type as BackupableKind) || service.type === "compose") && (
                    <Action.Push
                      icon={Icon.Cloud}
                      title="View Backups"
                      target={<ServiceBackups service={{ ...service, type: service.type as BackupableKind }} />}
                    />
                  )}
                  {(service.type === "application" || service.type === "compose") && (
                    <Action.Push
                      icon={Icon.Clock}
                      title="View Schedules"
                      target={<ServiceSchedules service={{ ...service, type: service.type }} />}
                    />
                  )}
                </ActionPanel.Section>
                {DATABASE_KINDS.includes(service.type as DatabaseKind) && (
                  <DatabaseActions url={url} headers={headers} kind={service.type as DatabaseKind} service={service} />
                )}
                <Action
                  icon={Icon.Trash}
                  title="Delete"
                  style={Action.Style.Destructive}
                  onAction={() => deleteService(service)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function CreateApplication({ environment, instance }: { environment: ServiceScope; instance?: Instance }) {
  const activeToken = useToken();
  const { url, headers } = instance ? tokenForInstance(instance) : activeToken;
  const { pop } = useNavigation();

  interface FormValues {
    name: string;
    appName: string;
    description: string;
    projectId: string;
    serverId: string;
  }

  const { isLoading, data: servers } = useFetch<Server[], Server[]>(url + "server.all", {
    headers,
    initialData: [],
  });

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating Application", values.name);
      try {
        const response = await fetch(url + "application.create", {
          method: "POST",
          headers,
          body: JSON.stringify({ ...values, projectId: environment.projectId }),
        });
        if (!response.ok) {
          const err = (await response.json()) as ErrorResult;
          throw new Error(err.message);
        }
        toast.style = Toast.Style.Success;
        toast.title = "Created Application";
        // Pops back to Services instead of popToRoot() - the Action.Push that opened this form
        // has its own onPop calling revalidate, which only actually refreshes what's on screen if
        // Services stays mounted (popToRoot() tore it down before the fire-and-forget revalidate
        // could land, confirmed live for the same popToRoot()-based pattern on Deploy Template).
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create Application";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      appName: environment.name.toLowerCase().replaceAll(" ", "-") + "-",
    },
    validation: {
      name: FormValidation.Required,
      appName: FormValidation.Required,
    },
  });
  return (
    <Form
      navigationTitle="Services"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Create" text="Assign a name and description to your application" />
      <Form.TextField title="Name" placeholder="Frontend" {...itemProps.name} />
      <Form.Dropdown
        title="Select a Server (Optional)"
        info="If no server is selected, the application will be deployed on the server where the user is logged in."
        {...itemProps.serverId}
      >
        {servers.map((server) => (
          <Form.Dropdown.Item key={server.id} title={server.name} value={server.id} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="App Name" placeholder="my-app" {...itemProps.appName} />
      <Form.TextArea title="Description" placeholder="Description of your service" {...itemProps.description} />
    </Form>
  );
}

function CreateDatabase({ environment, instance }: { environment: ServiceScope; instance?: Instance }) {
  const activeToken = useToken();
  const { url, headers } = instance ? tokenForInstance(instance) : activeToken;
  const { pop } = useNavigation();
  interface FormValues {
    dbType: string;

    name: string;
    appName: string;
    description: string;
    projectId: string;
    serverId: string;

    databaseName: string;
    databaseUser: string;
    databasePassword: string;
    databaseRootPassword: string;
  }

  const { isLoading, data: servers } = useFetch<Server[], Server[]>(url + "server.all", {
    headers,
    initialData: [],
  });

  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating Database", values.name);
      try {
        const { dbType, ...database } = values;
        const db: Partial<FormValues> = database;
        switch (dbType) {
          case "postgres":
            delete db.databaseRootPassword;
            break;
          case "mongo":
            delete db.databaseName;
            delete db.databaseRootPassword;
            break;
          case "redis":
            delete db.databaseName;
            delete db.databaseUser;
            delete db.databaseRootPassword;
            break;
          default:
            break;
        }

        const response = await fetch(url + `${dbType}.create`, {
          method: "POST",
          headers,
          body: JSON.stringify({ ...db, projectId: environment.projectId }),
        });
        if (!response.ok) {
          const err = (await response.json()) as ErrorResult;
          throw new Error(err.message);
        }
        toast.style = Toast.Style.Success;
        toast.title = "Created Database";
        // See the matching comment in CreateApplication - pops back to Services instead of
        // popToRoot() so the Action.Push's onPop-triggered revalidate actually lands.
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create Database";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      appName: environment.name.toLowerCase().replaceAll(" ", "-") + "-",
    },
    validation: {
      name: FormValidation.Required,
      appName: FormValidation.Required,
      databaseName(value) {
        if (["postgres", "mariadb", "mysql"].includes(values.dbType) && !value) return "The item is required";
      },
      databaseUser(value) {
        if (values.dbType !== "redis" && !value) return "The item is required";
      },
      databasePassword: FormValidation.Required,
      databaseRootPassword(value) {
        if (["mariadb", "mysql"].includes(values.dbType) && !value) return "The item is required";
      },
    },
  });
  return (
    <Form
      navigationTitle="Services"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Select a database" {...itemProps.dbType}>
        <Form.Dropdown.Item icon="postgres.svg" title="PostgreSQL" value="postgres" />
        <Form.Dropdown.Item icon="mongo.svg" title="MongoDB" value="mongo" />
        <Form.Dropdown.Item icon="mariadb.svg" title="MariaDB" value="mariadb" />
        <Form.Dropdown.Item icon="mysql.svg" title="MySQL" value="mysql" />
        <Form.Dropdown.Item icon="redis.svg" title="Redis" value="redis" />
      </Form.Dropdown>

      <Form.TextField title="Name" placeholder="Name" {...itemProps.name} />
      <Form.Dropdown
        title="Select a Server (Optional)"
        info="If no server is selected, the application will be deployed on the server where the user is logged in."
        {...itemProps.serverId}
      >
        {servers.map((server) => (
          <Form.Dropdown.Item key={server.id} title={server.name} value={server.id} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="App Name" placeholder="my-app" {...itemProps.appName} />
      <Form.TextArea title="Description" placeholder="Description of your service" {...itemProps.description} />

      <Form.Separator />
      {["postgres", "mariadb", "mysql"].includes(values.dbType) && (
        <Form.TextField title="Database Name" placeholder="Database Name" {...itemProps.databaseName} />
      )}
      {values.dbType !== "redis" && (
        <Form.TextField title="Database User" placeholder={`Default ${values.dbType}`} {...itemProps.databaseUser} />
      )}
      <Form.PasswordField title="Database Password" placeholder="******************" {...itemProps.databasePassword} />
      {["mariadb", "mysql"].includes(values.dbType) && (
        <Form.PasswordField
          title="Database Root Password"
          placeholder="******************"
          {...itemProps.databaseRootPassword}
        />
      )}
    </Form>
  );
}
