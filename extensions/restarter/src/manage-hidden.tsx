import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { RunningApp, fuzzyFilter, loadHidden, saveHidden } from "./lib";

export default function Command() {
  const [hidden, setHidden] = useState<Map<string, RunningApp>>(new Map());
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHidden()
      .then(setHidden)
      .catch((err) =>
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load hidden apps",
          message: String(err),
        }),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const items = useMemo(
    () => [...hidden.values()].sort((a, b) => a.name.localeCompare(b.name)),
    [hidden],
  );
  const filtered = useMemo(
    () => fuzzyFilter(items, searchText, (a) => a.name),
    [items, searchText],
  );

  async function unhide(app: RunningApp) {
    const next = new Map(hidden);
    next.delete(app.bundleId);
    setHidden(next);
    await saveHidden(next);
    await showToast({
      style: Toast.Style.Success,
      title: `Unhidden ${app.name}`,
    });
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search hidden apps…"
    >
      {filtered.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.EyeDisabled}
          title="No hidden apps"
          description="Hide an app from the restarter command with ⌘H."
        />
      ) : (
        filtered.map((app) => {
          const icon = app.path ? { fileIcon: app.path } : Icon.AppWindow;
          return (
            <List.Item
              key={app.bundleId}
              title={app.name}
              subtitle={app.bundleId}
              icon={icon}
              actions={
                <ActionPanel>
                  <Action
                    title="Unhide"
                    icon={Icon.Eye}
                    onAction={() => unhide(app)}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
