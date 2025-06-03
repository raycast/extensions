import { ActionPanel, Action, Icon, List, Form, showToast, Toast, Alert, confirmAlert, popToRoot, Color } from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { ErrorResult, Project, Server, Service } from "./interfaces";
import { useToken } from "./api-keys";

function getProjectTotalServices(project: Project) {
  return project.applications.length +
        project.mariadb.length +
        project.mongo.length +
        project.mysql.length +
        project.postgres.length +
        project.redis.length +
        project.compose.length;
}
export default function Projects() {
  const { url, headers } = useToken();

const { isLoading, data: projects } = useFetch<Project[], Project[]>(url + "project.all", {
  headers,
  initialData: []
})

  return (
    <List isLoading={isLoading}>
      {projects.map(project => <List.Item key={project.projectId} icon={Icon.Book} title={project.name} subtitle={
        `${getProjectTotalServices(project)} services`
      } accessories={[
        {date: new Date(project.createdAt)}
      ]} 
    actions={<ActionPanel>
      <Action.Push icon="folder-input.svg" title="Services" target={<Services project={project} />} />
    </ActionPanel>} />)}
    </List>
  );
}


function Services({project}: {project: Project;}) {
    const { url, headers } = useToken();

  interface GroupedService extends Service {
    type: string;
    id: string;
    status: "idle" | "done";
  }
  const services: GroupedService[] = [
    ...project.applications.map(a => ({...a, type: "application", id: a.applicationId, status: a.applicationStatus})),
    ...project.mariadb.map(m => ({...m, type: "mariadb", id: m.mariadbId, status: m.applicationStatus})),
    ...project.mongo.map(m => ({...m, type: "mongo", id: m.mongoId, status: m.applicationStatus})),
    ...project.mysql.map(m => ({...m, type: "mysql", id: m.mysqlId, status: m.applicationStatus})),
    ...project.postgres.map(p => ({...p, type: "postgres", id: p.postgresId, status: p.applicationStatus})),
    ...project.redis.map(r => ({...r, type: "redis", id: r.redisId, status: r.applicationStatus})),
    ...project.compose.map(c => ({...c, type: "compose", id: c.composeId, status: c.composeStatus})),
  ];

  async function deleteService({ id, name, type }: GroupedService) {
    const options: Alert.Options = {
      title: "Delete Services",
      message: "Are you sure you want to delete 1 services? This action cannot be undone.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Confirm"
      }
    }
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
            body: JSON.stringify(body)
          })
          if (!response.ok) {
            const err: ErrorResult = await response.json();
            throw new Error(err.message);
          }
        toast.style = Toast.Style.Success;
        toast.title = "Deleted service";
        await popToRoot();
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
    redis: "redis.svg"
  }

  return <List isShowingDetail>
    {!getProjectTotalServices(project) ? <List.EmptyView icon="folder-input.svg" title="No services added yet. Go to Create Service." actions={<ActionPanel>
      <ActionPanel.Submenu icon={Icon.Plus} title="Create">
        <Action.Push icon="folder-input.svg" title="Application" target={<CreateApplication project={project} />} />
        <Action.Push icon="database.svg" title="Database" target={<CreateDatabase project={project} />} />
      </ActionPanel.Submenu>
    </ActionPanel>} /> : services.map(service => <List.Item key={service.id} icon={SERVICE_ICONS[service.type]} title={service.name} accessories={[
      { icon: { source: Icon.CircleFilled, tintColor: service.status==="done" ? Color.Green : "#18181B" }, tooltip: service.status }
    ]} detail={<List.Item.Detail markdown={service.description} metadata={<List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Name" text={service.name} />
      <List.Item.Detail.Metadata.Label title="Application Name" text={service.appName} />
    </List.Item.Detail.Metadata>} />} actions={<ActionPanel>
      <ActionPanel.Submenu icon={Icon.Plus} title="Create">
        <Action.Push icon="folder-input.svg" title="Application" target={<CreateApplication project={project} />} />
        <Action.Push icon="database.svg" title="Database" target={<CreateDatabase project={project} />} />
      </ActionPanel.Submenu>
        <Action icon={Icon.Trash} title="Delete" style={Action.Style.Destructive} onAction={() => deleteService(service)} />
    </ActionPanel>} />)}
  </List>
}

function CreateApplication({ project }: {project: Project}) {
    const { url, headers } = useToken();

  interface FormValues {
    name: string;
    appName: string;
    description: string;
    projectId: string;
    serverId: string;
  }
  
  const { isLoading, data: servers } = useFetch<Server[], Server[]>(url + "server.all", {
  headers,
  initialData: []
})

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating Application", values.name);
      try {
          const response = await fetch(url + "application.create", {
            method: "POST",
            headers,
            body: JSON.stringify({...values, projectId: project.projectId})
          })
          if (!response.ok) {
            const err: ErrorResult = await response.json();
            throw new Error(err.message);
          }
        toast.style = Toast.Style.Success;
        toast.title = "Created Application";
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create Application";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      appName: project.name.toLowerCase().replaceAll(" ", "-") + "-"
    },
    validation: {
      name: FormValidation.Required,
      appName: FormValidation.Required
    }
  })
  return <Form isLoading={isLoading} actions={<ActionPanel>
    <Action.SubmitForm icon={Icon.Plus} title="Create" onSubmit={handleSubmit} />
  </ActionPanel>}>
    <Form.Description title="Create" text="Assign a name and description to your application" />
    <Form.TextField title="Name" placeholder="Frontend" {...itemProps.name} />
    <Form.Dropdown title="Select a Server (Optional)" info="If no server is selected, the application will be deployed on the server where the user is logged in." {...itemProps.serverId}>
      {servers.map(server => <Form.Dropdown.Item key={server.id} title={server.name} value={server.id} />)}
    </Form.Dropdown>
    <Form.TextField title="App Name" placeholder="my-app" {...itemProps.appName} />
    <Form.TextArea title="Description" placeholder="Description of your service" {...itemProps.description} />
  </Form>
}

function CreateDatabase({ project }: {project: Project}) {
    const { url, headers } = useToken();
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
  initialData: []
})

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
            body: JSON.stringify({...db, projectId: project.projectId})
          })
          if (!response.ok) {
            const err: ErrorResult = await response.json();
            throw new Error(err.message);
          }
        toast.style = Toast.Style.Success;
        toast.title = "Created Database";
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create Database";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      appName: project.name.toLowerCase().replaceAll(" ", "-") + "-"
    },
    validation: {
      name: FormValidation.Required,
      appName: FormValidation.Required,
      databaseName(value) {
        if (["postgres", "mariadb", "mysql"].includes(values.dbType) && !value) return "The item is required";
      },
      databaseUser(value) {
        if (values.dbType!=="redis" && !value) return "The item is required";
      },
      databasePassword: FormValidation.Required,
      databaseRootPassword(value) {
        if (["mariadb", "mysql"].includes(values.dbType) && !value) return "The item is required";
      },
    }
  })
  return <Form isLoading={isLoading} actions={<ActionPanel>
    <Action.SubmitForm icon={Icon.Plus} title="Create" onSubmit={handleSubmit} />
  </ActionPanel>}>
  <Form.Dropdown title="Select a database" {...itemProps.dbType}>
    <Form.Dropdown.Item icon="postgres.svg" title="PostgreSQL" value="postgres" />
    <Form.Dropdown.Item icon="mongo.svg" title="MongoDB" value="mongo" />
    <Form.Dropdown.Item icon="maria.svg" title="MariaDB" value="mariadb" />
    <Form.Dropdown.Item icon="mysql.svg" title="MySQL" value="mysql" />
    <Form.Dropdown.Item icon="redis.svg" title="Redis" value="redis" />
  </Form.Dropdown>

    <Form.TextField title="Name" placeholder="Name" {...itemProps.name} />
    <Form.Dropdown title="Select a Server (Optional)" info="If no server is selected, the application will be deployed on the server where the user is logged in." {...itemProps.serverId}>
      {servers.map(server => <Form.Dropdown.Item key={server.id} title={server.name} value={server.id} />)}
    </Form.Dropdown>
    <Form.TextField title="App Name" placeholder="my-app" {...itemProps.appName} />
    <Form.TextArea title="Description" placeholder="Description of your service" {...itemProps.description} />


    <Form.Separator />
    {["postgres", "mariadb", "mysql"].includes(values.dbType) && <Form.TextField title="Database Name" placeholder="Database Name" {...itemProps.databaseName} />}
    {values.dbType!=="redis" && <Form.TextField title="Database User" placeholder={`Default ${values.dbType}`} {...itemProps.databaseUser} />}
    <Form.PasswordField title="Database Password" placeholder="******************" {...itemProps.databasePassword} />
    {["mariadb", "mysql"].includes(values.dbType) && <Form.PasswordField title="Database Root Password" placeholder="******************" {...itemProps.databaseRootPassword} />}
  </Form>
}