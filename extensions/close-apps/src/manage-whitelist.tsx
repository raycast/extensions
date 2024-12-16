import { Action, ActionPanel, List, showToast, Toast, Icon, Color } from "@raycast/api";
import { getAllApps, closeNotWhitelisted, getOpenApps } from "./scripts";
import type { Application } from "./types";
import { useLocalStorage, usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import fs from "node:fs";

type ListState = "whitelisted" | "open" | "all";

const StateToTitle: Record<ListState, string> = {
  whitelisted: "Whitelisted Apps",
  open: "Open Apps",
  all: "All Apps",
};

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

  const cycleListState = () => {
    const states = Object.keys(StateToTitle) as ListState[];
    const currentIndex = states.indexOf(listState);
    const nextIndex = (currentIndex + 1) % states.length;
    const nextState = states[nextIndex];
    setListState(nextState);
  };

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
    <List isLoading={allAppsLoading || openAppsLoading} searchBarPlaceholder="Filter apps...">
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
                <Action
                  title={app.isWhitelisted ? "Remove from Whitelist" : "Add to Whitelist"}
                  icon={app.isWhitelisted ? Icon.Shield : Icon.Shield}
                  onAction={() => toggleWhitelist(app)}
                />

                <Action title="Close Non-whitelisted Apps" icon={Icon.XMarkCircle} onAction={closeAllNonWhitelisted} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action
                  title="View Whitelist"
                  icon={Icon.List}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                  onAction={cycleListState}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
