import { Action, ActionPanel, List, showToast, Toast, Icon, Color } from "@raycast/api";
import { getAllApps, closeNotWhitelisted, getOpenApps } from "./scripts";
import type { Application } from "./types";
import { useLocalStorage, usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import fs from "node:fs";

export default function AppList() {
  const [listState, setListState] = useState<ListState>("all");

  const { value: whitelistedApps, setValue: setWhitelistedApps } = useLocalStorage<string[]>("whitelistedApps", []);

  const {
    data: allApps,
    isLoading: allAppsLoading,
    revalidate,
  } = usePromise(
    async (whitelistedApps: string[] | undefined) => {
      const apps = await getAllApps();
      if (!whitelistedApps) {
        return apps.map((app) => ({
          name: app,
          isWhitelisted: false,
        }));
      }

      const allApps = apps.map((app) => ({
        name: app,
        isWhitelisted: whitelistedApps?.includes(app) || app === "Raycast",
      }));

      return allApps;
    },
    [whitelistedApps],
  );

  const { data: openApps, isLoading: openAppsLoading } = usePromise(
    async (whitelistedApps: string[] | undefined) => {
      const openApps = await getOpenApps();
      return openApps.map((app) => ({
        name: app,
        isWhitelisted: whitelistedApps?.includes(app) || app === "Raycast",
      }));
    },
    [whitelistedApps],
  );

  const apps = useMemo(() => {
    switch (listState) {
      case "all":
        return allApps;
      case "open":
        return openApps;
      case "whitelisted":
        return whitelistedApps?.map((app) => ({
          name: app,
          isWhitelisted: true,
        }));
      default:
        return [];
    }
  }, [listState, allApps, openApps, whitelistedApps]);

  const toggleWhitelist = (application: Application) => {
    const newWhitelist = application.isWhitelisted
      ? whitelistedApps?.filter((app) => app !== application.name) || []
      : [...(whitelistedApps || []), application.name];

    setWhitelistedApps(newWhitelist);
    revalidate();

    showToast({
      style: Toast.Style.Success,
      title: `${application.name} ${application.isWhitelisted ? "removed from" : "added to"} whitelist`,
    });
  };

  const closeAllNonWhitelisted = async () => {
    try {
      await closeNotWhitelisted();
      showToast({
        style: Toast.Style.Success,
        title: "Closed all non-whitelisted apps",
      });
      revalidate();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to close apps",
        message: String(error),
      });
    }
  };

  const getAdjacentListState = (currentState: ListState, type: "next" | "prev") => {
    const states = Object.keys(StateToTitle) as ListState[];
    const currentIndex = states.indexOf(currentState);
    const nextIndex =
      type === "next" ? (currentIndex + 1) % states.length : (currentIndex - 1 + states.length) % states.length;
    return states[nextIndex];
  };

  const cycleListState = () => {
    const nextState = getAdjacentListState(listState, "next");
    setListState(nextState);
  };

  const nextStateTitle = `Show ${StateToTitle[getAdjacentListState(listState, "next")]}`;
  const prevStateTitle = `Show ${StateToTitle[getAdjacentListState(listState, "prev")]}`;

  const extractIcon = (app: string) => {
    const applicationPaths = [`/Applications/${app}.app`, `/System/Applications/${app}.app`];
    return (
      applicationPaths.find((path) => {
        try {
          return fs.existsSync(path);
        } catch {
          return false;
        }
      }) || `/Applications/${app}.app`
    );
  };

  return (
    <List
      navigationTitle={StateToTitle[listState]}
      isLoading={allAppsLoading || openAppsLoading}
      searchBarPlaceholder="Filter apps..."
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Navigation">
            <CycleListState title={nextStateTitle} action={cycleListState} type="next" />
            <CycleListState title={prevStateTitle} action={cycleListState} type="prev" />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <List.Section title={StateToTitle[listState]} subtitle={`${apps?.length} apps`}>
        {apps?.map((app) => (
          <List.Item
            key={app.name}
            title={app.name}
            icon={{ fileIcon: extractIcon(app.name) }}
            accessories={[
              {
                icon: app.isWhitelisted
                  ? { source: Icon.Check, tintColor: Color.Green }
                  : { source: Icon.Xmark, tintColor: Color.SecondaryText },
                tooltip: app.isWhitelisted ? "Whitelisted" : "Not whitelisted",
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Actions">
                  <Action
                    title={app.isWhitelisted ? "Remove from Whitelist" : "Add to Whitelist"}
                    icon={app.isWhitelisted ? Icon.Shield : Icon.Shield}
                    onAction={() => toggleWhitelist(app)}
                  />

                  <Action
                    title="Close Non-whitelisted Apps"
                    icon={Icon.XMarkCircle}
                    onAction={closeAllNonWhitelisted}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={revalidate}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Navigation">
                  <CycleListState title={nextStateTitle} action={cycleListState} type="next" />
                  <CycleListState title={prevStateTitle} action={cycleListState} type="prev" />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

type CycleListStateProps = {
  title: string;
  action: () => void;
  type?: "next" | "prev";
};

const CycleListState = ({ title, action, type = "next" }: CycleListStateProps) => {
  return (
    <Action
      title={title}
      icon={Icon.List}
      shortcut={{ modifiers: ["shift"], key: type === "next" ? "." : "," }}
      onAction={action}
    />
  );
};

type ListState = "whitelisted" | "open" | "all";

const StateToTitle: Record<ListState, string> = {
  whitelisted: "Whitelisted Apps",
  open: "Open Apps",
  all: "All Apps",
};
