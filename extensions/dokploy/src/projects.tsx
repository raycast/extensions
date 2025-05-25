import { ActionPanel, Action, Icon, List, getPreferenceValues, Form, showToast, Toast, useNavigation, Grid } from "@raycast/api";
import { FormValidation, MutatePromise, useFetch, useForm } from "@raycast/utils";
import { Application, Project } from "./interfaces";

const { instance_url, api_token } = getPreferenceValues<Preferences>();
const API_URL = new URL("api/", instance_url).toString();
const API_HEADERS = {
  "Content-Type": "application/json",
    "x-api-key": api_token
  }

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
const { isLoading, data: projects, mutate } = useFetch<Project[], Project[]>(API_URL + "project.all", {
  headers: API_HEADERS,
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
      <Action.Push icon="folder-input.svg" title="Services" target={<Services project={project} mutateProjects={mutate} />} />
    </ActionPanel>} />)}
    </List>
  );
}

function Services({project, mutateProjects}: {project: Project; mutateProjects: MutatePromise<Project[]>}) {
  return <Grid>
    {!getProjectTotalServices(project) ? <Grid.EmptyView icon="folder-input.svg" title="No services added yet. Go to Create Service." actions={<ActionPanel>
      <ActionPanel.Submenu icon={Icon.Plus} title="Create">
        <Action.Push icon="folder-input.svg" title="Application" target={<CreateApplication project={project} mutateProjects={mutateProjects} />} />
      </ActionPanel.Submenu>
    </ActionPanel>} /> : project.applications.map(application => <Grid.Item key={application.applicationId} content={Icon.Globe} title={application.name} accessory={{ icon: { source: Icon.CircleFilled, tintColor: "#18181B" }, tooltip: application.applicationStatus }} actions={<ActionPanel>
      <ActionPanel.Submenu icon={Icon.Plus} title="Create">
        <Action.Push icon="folder-input.svg" title="Application" target={<CreateApplication project={project} mutateProjects={mutateProjects} />} />
      </ActionPanel.Submenu>
    </ActionPanel>} />)}
  </Grid>
}

function CreateApplication({ project, mutateProjects }: {project: Project; mutateProjects: MutatePromise<Project[]>}) {
  interface FormValues {
    name: string;
    appName: string;
    description: string;
    projectId: string;
    serverId: string;
  }
  
  interface Server {id: string; name: string};
  const {pop} = useNavigation();
  const { isLoading, data: servers } = useFetch<Server[], Server[]>(API_URL + "server.all", {
  headers: API_HEADERS,
  initialData: []
})

interface Issue {
  code?: string;
  expected?: string;
  received?: string;
  path?: string[];
  message: string;
}
interface ErrorResult {
  message: string;
  code?: string;
  issues?: Issue[];
}
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating Application", values.name);
      try {
        await mutateProjects(
          fetch(API_URL + "application.create", {
            method: "POST",
            headers: API_HEADERS,
            body: JSON.stringify({...values, projectId: project.projectId})
          }).then(async response => {
            if (!response.ok) {
              const err: ErrorResult = await response.json();
              console.log(err.issues)
              throw new Error(err.message);
            }
          }), {
            optimisticUpdate(data) {
              const newApplication: Application = {
                ...values,
              };
              return data.map(p => p.projectId!==project.projectId ? p : {...p, applications: [...p.applications, values]})
            },
          }
        )
        toast.style = Toast.Style.Success;
        toast.title = "Created Application";
        pop();
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