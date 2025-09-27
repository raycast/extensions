import { Action, ActionPanel, Detail, Form, getPreferenceValues, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm, usePromise } from "@raycast/utils";
import { authenticate, callInfisical, infisical, useInfisical } from "./infisical";
import { CreateSecretOptions, Project } from "@infisical/sdk";
import { useState } from "react";

interface Workspace {
  id: string
  name: string
  slug: string
  organization: string
  environments: Array<{name: string; slug: string;}>
}

const {organizationId} = getPreferenceValues<Preferences>();
export default function SearchProjects() {
  const {isLoading, data: workspaces, error} = useCachedPromise(async() => {
    await authenticate();
    const result = await callInfisical<{workspaces: Workspace[]}>(`v2/organizations/${organizationId}/workspaces`);
    return result.workspaces;
  }, [], {
    initialData: []
  })
  
  return <List isLoading={isLoading}>
    {workspaces.map(workspace => <List.Item key={workspace.id} icon={Icon.AppWindowList} title={workspace.name} subtitle={workspace.slug}
    // we hide action until authenticate is guaranteed to have succeeded
    actions={!isLoading && !error && <ActionPanel>
      <Action.Push icon={Icon.AppWindowList} title="Details" target={<ProjectDetails slug={workspace.slug} />} />
      <Action.Push icon={Icon.Key} title="Secrets" target={<ProjectSecrets workspace={workspace} />} />
    </ActionPanel>} />)}
  </List>
}

interface DetailedProject extends Project {
  version: number;
  // upgradeStatus: null,
  pitVersionLimit: number
  // kmsCertificateKeyId: null,
  // auditLogsRetentionDays: null,
  hasDeleteProtection: boolean;
  secretSharing: boolean;
  showSnapshotsLegacy: boolean;
  secretDetectionIgnoreValues: null,
  environments: Array<{name: string; slug: string;}>
}
function ProjectDetails({slug}: {slug: string}) {
  const {isLoading, data: project} = useInfisical<DetailedProject>(`v2/workspace/${slug}`);
  
  return <Detail isLoading={isLoading} markdown={project?.description} metadata={project && <Detail.Metadata>
    <Detail.Metadata.Label title="General" icon={Icon.EllipsisVertical} />
    <Detail.Metadata.Label title="Name" text={project.name} />
    <Detail.Metadata.Label title="Slug" text={project.slug} />
    
    <Detail.Metadata.Label title="Secrets Management" icon={Icon.EllipsisVertical} />
      <Detail.Metadata.TagList title="Environments">
        {project.environments.map(environment=><Detail.Metadata.TagList.Item key={environment.slug} text={environment.name} />)}
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label title="Allow Secret Sharing" icon={project.secretSharing ? Icon.Check: Icon.Xmark} />
      <Detail.Metadata.Label title="Show Secret Snapshots ( legacy )" icon={project.showSnapshotsLegacy ? Icon.Check: Icon.Xmark} />
      <Detail.Metadata.Label title="Version Retention" text={project.pitVersionLimit.toString()} />
      {/* <List.Item.Detail.Metadata.Label title="Version" text={project.version.toString()} /> */}

  </Detail.Metadata>} actions={project && <ActionPanel>
      <Action.CopyToClipboard title="Copy Project Slug" content={project.slug} />
      <Action.CopyToClipboard title="Copy Project ID" content={project.id} />
    </ActionPanel>} />
}

function ProjectSecrets({workspace}: {workspace: Workspace}) {
  const [environment, setEnvironment] = useState(workspace.environments[0].slug);
  const {isLoading, data:secrets=[], error} = usePromise(async(environment)=>{
    const res = await infisical.secrets().listSecrets({
      projectId: workspace.id,
      environment
    });
    return res.secrets;
  },[environment])

  return <List isLoading={isLoading} isShowingDetail searchBarAccessory={<List.Dropdown tooltip="Environment" onChange={setEnvironment}>
    {workspace.environments.map(environment =><List.Dropdown.Item key={environment.slug} title={environment.name} value={environment.slug} />)}
  </List.Dropdown>}>
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