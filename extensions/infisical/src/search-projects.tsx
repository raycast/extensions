import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { authenticate, callInfisical } from "./infisical";
import { Project } from "@infisical/sdk";

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