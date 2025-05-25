import { ActionPanel, Action, Icon, List, getPreferenceValues, Form } from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";

const { instance_url, api_token } = getPreferenceValues<Preferences>();
const API_URL = new URL("api/", instance_url).toString();
interface Project {
  projectId: string;
  name: string;
  description: string;
  createdAt: string;
  organizationId: string;
  env: string;
  applications: [];
  mariadb: [];
  mongo: [];
  mysql: [];
  postgres: [];
  redis: [];
  compose: [];
}
export default function Projects() {
const { isLoading, data: projects } = useFetch(API_URL + "project.all", {
  headers: {
    "x-api-key": api_token
  },
  mapResult(result: Project[]) {
    const data = result.map(project => {
      const totalServices = project.applications.length +
        project.mariadb.length +
        project.mongo.length +
        project.mysql.length +
        project.postgres.length +
        project.redis.length +
        project.compose.length;
        return {...project, totalServices};
    })
    return {
      data
    }
  },
  initialData: []
})
  return (
    <List isLoading={isLoading}>
      {projects.map(project => <List.Item key={project.projectId} icon={Icon.Book} title={project.name} subtitle={
        `${project.totalServices} services`
      } accessories={[
        {date: new Date(project.createdAt)}
      ]} 
    actions={<ActionPanel>
      <Action.Push title="Services" target={<Services project={project} />} />
    </ActionPanel>} />)}
    </List>
  );
}

function Services({project}: {project: Project & {totalServices: number}}) {
  return <List>
    {!project.totalServices ? <List.EmptyView icon="folder-input.svg" title="No services added yet. Go to Create Service." actions={<ActionPanel>
      <Action.Push icon={Icon.Plus} title="Create Service" target={<CreateService project={project} />} />
    </ActionPanel>} /> : <></>}
  </List>
}

function CreateService({ project }: {project: Project}) {
  interface CreateApplication {
    name: string;
    appName: string;
    description: string;
    projectId: string;
    serverId: string;
  }
  const { handleSubmit, itemProps } = useForm<CreateApplication>({
    onSubmit(values) {
      
    },
    initialValues: {
      appName: project.name.toLowerCase().replaceAll(" ", "-") + "-"
    },
    validation: {
      name: FormValidation.Required,
      appName: FormValidation.Required
    }
  })
  return <Form actions={<ActionPanel>
    <Action.SubmitForm title="Create" onSubmit={handleSubmit} />
  </ActionPanel>}>
    <Form.Description title="Create" text="Assign a name and description to your application" />
    <Form.TextField title="Name" placeholder="Frontend" {...itemProps.name} />
    <Form.TextField title="App Name" placeholder="my-app" {...itemProps.appName} />
    <Form.TextArea title="Description" {...itemProps.description} />
  </Form>
}