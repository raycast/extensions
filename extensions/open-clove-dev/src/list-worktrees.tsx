import { ActionPanel, Action, List, open, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  readRoutes,
  getActiveWorktrees,
  type WorktreeInfo,
} from "./lib/portless";

export default function Command() {
  const [worktrees, setWorktrees] = useState<WorktreeInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    readRoutes()
      .then((routes) => getActiveWorktrees(routes))
      .then((wt) => {
        setWorktrees(wt);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

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
              {apps.map((app) => (
                <Action.OpenInBrowser
                  key={app.app}
                  title={`Open ${app.app}`}
                  url={app.url}
                />
              ))}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
