import { Action, ActionPanel, Form, getPreferenceValues, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm, usePromise } from "@raycast/utils";
import { authenticate, callInfisical, infisical, useInfisicalApi } from "./infisical";
import { CreateSecretOptions, Project, Secret } from "@infisical/sdk";

interface Workspace {
  id: string
  name: string
  slug: string
  organization: string
  environments: Array<{name: string; slug: string;}>
}

const {organizationId} = getPreferenceValues<Preferences>();
export default function SearchProjects() {
  const {isLoading, data: workspaces} = useCachedPromise(async() => {
    await authenticate();
    const result = await callInfisical<{workspaces: Workspace[]}>(`v2/organizations/${organizationId}/workspaces`);
    return result.workspaces;
  }, [], {
    initialData: []
  })
  
  return <List isLoading={isLoading}>
    {workspaces.map(workspace => <List.Item key={workspace.id} icon={Icon.AppWindowList} title={workspace.name} subtitle={workspace.slug} actions={<ActionPanel>
      <Action.Push icon={Icon.AppWindowList} title="Details" target={<ProjectDetails slug={workspace.slug} />} />
      <Action.Push icon={Icon.Key} title="Secrets" target={<ProjectSecrets id={workspace.id} />} />
    </ActionPanel>} />)}
  </List>
}

interface DetailedProject extends Project {
  type: string;
}
function ProjectDetails({slug}: {slug: string}) {
  const {isLoading, data: project} = usePromise(async() => {
    const result = await callInfisical<DetailedProject>(`v2/workspace/${slug}`);
    return result;
  })

  return <List isLoading={isLoading} isShowingDetail>
    {project && <>
    <List.Item title="General" detail={<List.Item.Detail markdown={project.description} metadata={<List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Name" text={project.name} />
      <List.Item.Detail.Metadata.Label title="Slug" text={project.slug} />
    </List.Item.Detail.Metadata>} />} />
    </>}
  </List>
}

function ProjectSecrets({id}: {id: string}) {
  const {isLoading, data:secrets=[], error} = usePromise(async()=>{
    const res = await infisical.secrets().listSecrets({
      projectId: id,
      environment: "dev"
    });
    return res.secrets;
  })

  return <List isLoading={isLoading} isShowingDetail>
    {!isLoading && !secrets.length && !error ? <List.EmptyView icon={Icon.Folder} description="Let's add some secrets" actions={<ActionPanel>
<Action.Push icon={Icon.Plus} title="Add Secret" target={<AddSecret />} />
    </ActionPanel>} /> :
    secrets.map(secret => <List.Item key={secret.id} icon={Icon.Key} title={secret.id} />)}
  </List>
}

function AddSecret() {
  type FormValues = {secretName: string} & CreateSecretOptions;
  const {pop} =useNavigation()
  const {handleSubmit,itemProps} = useForm<FormValues>({
    async onSubmit(values) {
      const {secretName,...rest} = values;
      const toast = await showToast(Toast.Style.Animated, "Creating", secretName);
      try {
        await infisical.secrets().createSecret(secretName, rest);
        toast.style = Toast.Style.Success;
        toast.title = "Created"
        pop();
      } catch (error) {
        const err = error as Error;
        let message = err.message;
        if (err.name.includes("InfisicalSDK")) {
            const jsonStart = err.message.indexOf('{');
            const jsonString = err.message.substring(jsonStart);
            const parsedMessage = JSON.parse(jsonString) as { message: Array<{code: string; expected: string; received: string; path: string[]; message: string;}> };
            const messageArray = parsedMessage.message;
            const firstMessage = messageArray[0];
            message = `${firstMessage.message}: ${firstMessage.path.join()}`;
        }
        toast.style = Toast.Style.Failure;
        toast.title = "Failed"
        toast.message = message;
      }
    },
    validation: {
      secretName:FormValidation.Required 
    }
  })
  return <Form actions={<ActionPanel><Action.SubmitForm icon={Icon.Plus} title="Create Secret" onSubmit={handleSubmit} /></ActionPanel>}>
    <Form.TextField title="Key" placeholder="Type your secret name" {...itemProps.secretName} />
    <Form.PasswordField title="Value" placeholder="EMPTY" {...itemProps.secretValue} />
  </Form>
}