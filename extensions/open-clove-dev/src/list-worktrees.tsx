import {
  ActionPanel,
  Action,
  List,
  open,
  showHUD,
  useNavigation,
  confirmAlert,
  Alert,
  Icon,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import {
  readRoutes,
  getActiveWorktrees,
  type WorktreeInfo,
  type WorktreeApp,
} from "./lib/portless";
import { stopWorktree } from "./lib/process-compose";

function WorkplacePicker({ app }: { app: WorktreeApp }) {
  const { pop } = useNavigation();
  const [search, setSearch] = useState("");

  return (
    <List
      searchBarPlaceholder="Enter workplace name (e.g. granola)"
      onSearchTextChange={setSearch}
    >
      <List.Item
        title={search || "Type a workplace name…"}
        subtitle={search ? `Opens ${app.url}/${search}` : undefined}
        actions={
          search.trim() ? (
            <ActionPanel>
              <Action
                title="Open Workplace"
                onAction={async () => {
                  const workplace = search.trim();
                  await open(app.url + "/" + workplace);
                  pop();
                  await showHUD(`Opened ${workplace}`);
                }}
              />
            </ActionPanel>
          ) : undefined
        }
      />
    </List>
  );
}

export default function Command() {
  const [worktrees, setWorktrees] = useState<WorktreeInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    setIsLoading(true);
    readRoutes()
      .then(async (routes) => {
        setWorktrees(await getActiveWorktrees(routes));
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  useEffect(refresh, []);

  return (
    <List isLoading={isLoading}>
      {worktrees.map(({ name, apps, branch }) => (
        <List.Item
          key={name}
          title={name}
          subtitle={branch ?? undefined}
          accessories={[{ text: apps.map((a) => a.app).join(", ") }]}
          actions={
            <ActionPanel>
              <Action
                title="Open All"
                onAction={async () => {
                  await Promise.all(apps.map((app) => open(app.url)));
                  await showHUD(
                    `Opened ${apps.map((a) => a.app).join(", ")} for ${name}`,
                  );
                }}
              />
              {apps.map((app) =>
                app.app === "workplace" ? (
                  <Action.Push
                    key={app.app}
                    title={`Open ${app.app}`}
                    target={<WorkplacePicker app={app} />}
                  />
                ) : (
                  <Action.OpenInBrowser
                    key={app.app}
                    title={`Open ${app.app}`}
                    url={app.url}
                  />
                ),
              )}
              <Action
                title="Stop Worktree"
                icon={Icon.Stop}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={async () => {
                  const confirmed = await confirmAlert({
                    title: "Stop Worktree",
                    message: `Stop all processes for ${name}?`,
                    primaryAction: {
                      title: "Stop",
                      style: Alert.ActionStyle.Destructive,
                    },
                  });
                  if (!confirmed) return;
                  const success = stopWorktree(name);
                  if (success) {
                    await showHUD(`Stopped ${name}`);
                    refresh();
                  } else {
                    await showHUD(`Failed to stop ${name}`);
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
