import * as React from "react";
import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { dirname } from "node:path";
import SessionList from "./components/session-list";
import NewThreadAction from "./components/new-thread-action";
import ChooseFolderAction from "./components/choose-folder-action";
import { loadProjects, projectName, type ThreadMode } from "./lib/threads";

const modes: ThreadMode[] = ["Interactive", "All", "Archived"];

export default function BrowseSessions() {
  const [mode, setMode] = React.useState<ThreadMode>("Interactive");
  const { data, isLoading, revalidate } = useCachedPromise(loadProjects, [mode]);
  const refresh = (
    <Action
      title="Refresh"
      icon={Icon.RotateClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => revalidate()}
    />
  );
  const folderActions = (
    <ActionPanel>
      <ChooseFolderAction />
      {refresh}
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Browse Codex Sessions"
      searchBarPlaceholder="Search project folders"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Session scope"
          value={mode}
          onChange={(value) => {
            if (modes.includes(value as ThreadMode)) setMode(value as ThreadMode);
          }}
        >
          {modes.map((value) => (
            <List.Dropdown.Item key={value} value={value} title={value === "All" ? "All (incl. automation)" : value} />
          ))}
        </List.Dropdown>
      }
    >
      {data?.degraded ? (
        <List.Section title="Project history unavailable">
          <List.Item
            id="degraded-project-state"
            title="State database unavailable"
            subtitle="Choose a folder, or use Search Codex Sessions to browse recent sessions."
            icon={Icon.Warning}
            actions={folderActions}
          />
        </List.Section>
      ) : null}
      <List.Section
        title="Projects"
        subtitle={
          data?.truncated ? "Showing the 500 most recently used folders" : "Open a folder to browse its sessions"
        }
      >
        {data?.rows.map((row) => (
          <List.Item
            key={row.cwd}
            id={row.cwd}
            title={projectName(row.cwd)}
            subtitle={dirname(row.cwd)}
            keywords={[row.cwd]}
            icon={Icon.Folder}
            accessories={[
              { text: `${row.session_count} ${row.session_count === 1 ? "session" : "sessions"}` },
              { date: new Date(row.last_used) },
              { icon: Icon.ChevronRight, tooltip: "Browse sessions" },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Browse Sessions"
                  icon={Icon.Folder}
                  target={<SessionList projectPath={row.cwd} initialScope={mode} />}
                />
                <ChooseFolderAction />
                <Action.CopyToClipboard title="Copy Project Path" content={row.cwd} />
                {refresh}
                <NewThreadAction projectPath={row.cwd} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="New Project">
        <List.Item
          id="choose-another-folder"
          title="Choose Another Folder…"
          subtitle="Start a thread in a folder outside this list"
          icon={Icon.NewFolder}
          actions={folderActions}
        />
      </List.Section>
      <List.EmptyView
        icon={data?.degraded ? Icon.Warning : Icon.Folder}
        title={data?.degraded ? "Project history unavailable" : "No project folders found"}
        description={
          data?.degraded
            ? "Try refreshing, or use Search Codex Sessions to browse recent sessions from files."
            : "Try a different search or session scope."
        }
        actions={folderActions}
      />
    </List>
  );
}
