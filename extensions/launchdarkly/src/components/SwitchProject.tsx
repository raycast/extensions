import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useProjectKey } from "../hooks/useProjectKey";
import { useProjects } from "../hooks/useLDMetadata";
import { getProjectUrl } from "../utils/ld-urls";

/**
 * Pick the active project. The selection lives in shared cached state, so the
 * views underneath re-query automatically; no callback is needed.
 */
export default function SwitchProject() {
  const { pop } = useNavigation();
  const { projectKey: current, setProjectKey, resetProjectKey, isDefault } = useProjectKey();
  const { data: projects, isLoading } = useProjects();

  async function select(key: string, name: string) {
    setProjectKey(key);
    await showToast({ style: Toast.Style.Success, title: `Switched to ${name}` });
    pop();
  }

  return (
    <List isLoading={isLoading} navigationTitle="Switch Project" searchBarPlaceholder="Search projects…">
      <List.Section title="Projects" subtitle={projects ? `${projects.length} projects` : undefined}>
        {(projects ?? []).map((project) => {
          const isCurrent = project.key === current;
          return (
            <List.Item
              key={project.key}
              icon={isCurrent ? { source: Icon.CheckCircle, tintColor: "raycast-green" } : Icon.Circle}
              title={project.name}
              subtitle={project.key}
              keywords={[project.key]}
              accessories={[
                ...(isCurrent ? [{ tag: "Current" }] : []),
                ...(project.tags ?? []).map((tag) => ({ tag })),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.Switch}
                    title="Use This Project"
                    onAction={() => select(project.key, project.name)}
                  />
                  <Action.OpenInBrowser title="Open in LaunchDarkly" url={getProjectUrl(project.key)} />
                  <Action.CopyToClipboard title="Copy Project Key" content={project.key} />
                  {!isDefault && (
                    <Action
                      icon={Icon.Undo}
                      title="Reset to Preference Default"
                      onAction={async () => {
                        resetProjectKey();
                        await showToast({ style: Toast.Style.Success, title: "Using project from preferences" });
                        pop();
                      }}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
