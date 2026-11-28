import { Action, ActionPanel, Icon, LaunchProps, List, popToRoot, showHUD } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import { agents, call, FailedView, link, name, projects, Projects, shown } from "./nextterm";

// The search starts with what was typed after the command's name ("Search Projects api"), or with the text Raycast
// passes when it runs as a fallback command (typed in Raycast's search, nothing else matched).
export default function Command(props: LaunchProps<{ arguments: Arguments.SearchProjects }>) {
  const [searchText, setSearchText] = useState(props.arguments.query?.trim() || props.fallbackText?.trim() || "");
  const { data, isLoading, error, revalidate } = usePromise(async () =>
    projects(await call<Projects>("list_projects")),
  );
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Open a Next Term project"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering
    >
      {error ? <FailedView error={error} retry={revalidate} /> : null}
      {(data ?? []).map((project) => (
        <List.Item
          key={project.path}
          icon={Icon.Folder}
          title={name(project.path)}
          subtitle={shown(project.path)}
          keywords={project.path.split("/").filter(Boolean)}
          accessories={[
            ...(project.open ? [{ tag: "Open" }] : []),
            ...(project.lastUsed ? [{ date: project.lastUsed, tooltip: "Last used" }] : []),
          ]}
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
                    onAction={async () => {
                      try {
                        const tab = await call<{ id: string }>("new_tab", {
                          directory: project.path,
                          command: agent.command,
                          title: agent.title,
                        });
                        await link("tab", { id: tab.id });
                        await showHUD(`${agent.title} started in ${name(project.path)}`);
                        await popToRoot();
                      } catch (error) {
                        await showFailureToast(error, { title: "Could not start the agent" });
                      }
                    }}
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
