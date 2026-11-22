import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { agents, call, link, name, projects, Projects, shown } from "./nextterm";

export default function Command() {
  const { data, isLoading, error } = usePromise(async () => projects(await call<Projects>("list_projects")));
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Open a Next Term project">
      {error ? (
        <List.EmptyView icon={Icon.Warning} title="Next Term didn't answer" description={error.message} />
      ) : null}
      {(data ?? []).map((project) => (
        <List.Item
          key={project.path}
          icon={Icon.Folder}
          title={name(project.path)}
          subtitle={shown(project.path)}
          accessories={project.open ? [{ tag: "Open" }] : []}
          actions={
            <ActionPanel>
              <Action
                title="Open in Next Term"
                icon={Icon.ArrowRight}
                onAction={() => link("open", { path: project.path })}
              />
              <ActionPanel.Submenu
                title="Start Agent Here"
                icon={Icon.Stars}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              >
                {agents.map((agent) => (
                  <Action
                    key={agent.command}
                    title={agent.title}
                    onAction={() =>
                      call("new_tab", { directory: project.path, command: agent.command, title: agent.title })
                    }
                  />
                ))}
              </ActionPanel.Submenu>
              <Action.ShowInFinder path={project.path} />
              <Action.CopyToClipboard title="Copy Path" content={project.path} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
