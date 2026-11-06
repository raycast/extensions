import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise, useCachedState, withAccessToken } from "@raycast/utils";
import { authorize } from "./lib/auth";
import { appUrl, askUrl } from "./lib/config";
import { type Project, type ProjectState, listProjects } from "./lib/twelfth";

const STATES: Record<ProjectState, string> = { live: "Live", closed: "Closed", archived: "Archived", all: "All" };

function Projects() {
  const [state, setState] = useCachedState<ProjectState>("projects.state", "live");
  const { data, isLoading, revalidate } = useCachedPromise((state: ProjectState) => listProjects(state), [state], {
    keepPreviousData: true,
  });

  // Overdue work first, then whatever moved most recently.
  const projects = [...(data ?? [])].sort(
    (a, b) => b.overdueTaskCount - a.overdueTaskCount || Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter projects…"
      searchBarAccessory={
        <List.Dropdown tooltip="State" value={state} onChange={(value) => setState(value as ProjectState)}>
          {(Object.keys(STATES) as ProjectState[]).map((key) => (
            <List.Dropdown.Item key={key} title={STATES[key]} value={key} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Folder}
        title={isLoading ? "Loading projects…" : "No projects"}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Twelfth" url={appUrl("/app")} />
          </ActionPanel>
        }
      />
      {projects.map((project) => (
        <List.Item
          key={project.id}
          title={project.name}
          subtitle={project.workflowLabel}
          keywords={[project.workflowLabel, project.owner?.name ?? "", project.stage?.label ?? ""]}
          icon={{ source: Icon.Folder, tintColor: project.overdueTaskCount ? Color.Red : Color.SecondaryText }}
          accessories={accessories(project)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Twelfth" url={projectUrl(project)} />
              <Action.OpenInBrowser
                title="Ask Twelfth for a Status Update"
                icon={Icon.SpeechBubble}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "k" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "k" },
                }}
                url={askUrl(`Where is the "${project.name}" project at, and what's blocking it?`)}
              />
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Link"
                  content={projectUrl(project)}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function projectUrl(project: Project) {
  return appUrl(`/app/projects/${encodeURIComponent(project.id)}`);
}

function accessories(project: Project): List.Item.Accessory[] {
  return [
    ...(project.overdueTaskCount
      ? [{ tag: { value: `${project.overdueTaskCount} overdue`, color: Color.Red } } as List.Item.Accessory]
      : []),
    ...(project.openTaskCount
      ? [{ icon: Icon.Circle, text: String(project.openTaskCount), tooltip: "Open tasks" }]
      : []),
    ...(project.stage
      ? [
          {
            tag: `${project.stage.index + 1}/${project.stage.total} ${project.stage.label}`,
            tooltip: "Stage",
          } as List.Item.Accessory,
        ]
      : []),
    ...(project.owner?.name ? [{ icon: Icon.Person, tooltip: `Owner: ${project.owner.name}` }] : []),
  ];
}

export default withAccessToken({ authorize })(Projects);
