import { Action, ActionPanel, Detail, getPreferenceValues, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { authenticate, callInfisical } from "./infisical";
import { Project } from "@infisical/sdk";
import { Workspace } from "./types";
import Secrets from "./secrets";

const { organizationId } = getPreferenceValues<Preferences>();
export default function SearchProjects() {
  const {
    isLoading,
    data: workspaces,
    error,
  } = useCachedPromise(
    async () => {
      await authenticate();
      const result = await callInfisical<{ workspaces: Workspace[] }>(`v2/organizations/${organizationId}/workspaces`);
      return result.workspaces;
    },
    [],
    {
      initialData: [],
    },
  );

  if (error)
    return (
      <Detail
        navigationTitle="Error"
        markdown={`# ERROR \n\n Invalid Preferences. \n Please ensure Preferences are valid. \n\n \`\`\`${error.message}\`\`\``}
        actions={
          <ActionPanel>
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );

  return (
    <List isLoading={isLoading}>
      {workspaces.map((workspace) => (
        <List.Item
          key={workspace.id}
          icon={Icon.AppWindowList}
          title={workspace.name}
          subtitle={workspace.slug}
          // we hide action until authenticate is guaranteed to have succeeded
          actions={
            !isLoading && (
              <ActionPanel>
                <Action.Push
                  icon={Icon.AppWindowList}
                  title="Details"
                  target={<ProjectDetails slug={workspace.slug} />}
                />
                <Action.Push icon={Icon.Key} title="Secrets" target={<Secrets project={workspace} />} />
              </ActionPanel>
            )
          }
        />
      ))}
    </List>
  );
}

interface DetailedProject extends Project {
  version: number;
  pitVersionLimit: number;
  hasDeleteProtection: boolean;
  secretSharing: boolean;
  showSnapshotsLegacy: boolean;
  secretDetectionIgnoreValues: null;
  environments: Array<{ name: string; slug: string }>;
}
function ProjectDetails({ slug }: { slug: string }) {
  const { isLoading, data: project } = useCachedPromise(() => callInfisical<DetailedProject>(`v2/workspace/${slug}`));

  return (
    <Detail
      navigationTitle={`Manage Projects / ${project?.name}`}
      isLoading={isLoading}
      markdown={project?.description}
      metadata={
        project && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="General" icon={Icon.EllipsisVertical} />
            <Detail.Metadata.Label title="Name" text={project.name} />
            <Detail.Metadata.Label title="Slug" text={project.slug} />

            <Detail.Metadata.Label title="Secrets Management" icon={Icon.EllipsisVertical} />
            <Detail.Metadata.TagList title="Environments">
              {project.environments.map((environment) => (
                <Detail.Metadata.TagList.Item key={environment.slug} text={environment.name} />
              ))}
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label
              title="Allow Secret Sharing"
              icon={project.secretSharing ? Icon.Check : Icon.Xmark}
            />
            <Detail.Metadata.Label
              title="Show Secret Snapshots ( legacy )"
              icon={project.showSnapshotsLegacy ? Icon.Check : Icon.Xmark}
            />
            <Detail.Metadata.Label title="Version Retention" text={project.pitVersionLimit.toString()} />
          </Detail.Metadata>
        )
      }
      actions={
        project && (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Project Slug" content={project.slug} />
            <Action.CopyToClipboard title="Copy Project ID" content={project.id} />
          </ActionPanel>
        )
      }
    />
  );
}
