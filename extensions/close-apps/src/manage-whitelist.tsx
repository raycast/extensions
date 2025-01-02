import { Action, ActionPanel, List, showToast, Toast, Icon } from "@raycast/api";
import { getAllApps, closeNotWhitelisted, getOpenApps } from "./scripts";
import type { Application } from "./types";
import { useCachedState, useLocalStorage, usePromise } from "@raycast/utils";
import { useMemo } from "react";
import ListItem from "./components/ListItem";

export default function AppList() {
  const [listState, setListState] = useCachedState<ListState>("show-details", "all");

  const { value: whitelistedAppNames, setValue: setWhitelistedApps } = useLocalStorage<string[]>("whitelistedApps", []);

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

      const allApps = apps
        .filter((app) => !whitelistedApps.includes(app))
        .map((app) => ({
          name: app,
          isWhitelisted: whitelistedApps?.includes(app) || app === "Raycast",
        }));

      return allApps;
    },
    [whitelistedAppNames],
  );

  const { data: openApps, isLoading: openAppsLoading } = usePromise(
    async (whitelistedApps: string[] | undefined) => {
      const openApps = await getOpenApps();
      return openApps.map((app) => ({
        name: app,
        isWhitelisted: whitelistedApps?.includes(app) || app === "Raycast",
      }));
    },
    [whitelistedAppNames],
  );

  const whitelist: Application[] = Array.from(new Set(whitelistedAppNames)).map((app) => ({
    name: app,
    isWhitelisted: true,
  }));

  const apps = useMemo(() => {
    switch (listState) {
      case "all":
        return allApps;
      case "open":
        return openApps;
      case "whitelisted":
        return whitelist;
      default:
        return [];
    }
  }, [listState, allApps, openApps, whitelist]);

  const toggleWhitelist = (application: Application) => {
    const newWhitelist = new Set(
      application.isWhitelisted
        ? whitelistedAppNames?.filter((app) => app !== application.name) || []
        : [...(whitelistedAppNames || []), application.name],
    );

    setWhitelistedApps(Array.from(newWhitelist));
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

  const NavigationSection = () => (
    <ActionPanel.Section title="Navigation">
      <CycleListState title={nextStateTitle} action={cycleListState} type="next" />
      <CycleListState title={prevStateTitle} action={cycleListState} type="prev" />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={allAppsLoading || openAppsLoading}
      searchBarPlaceholder="Filter apps..."
      actions={
        <ActionPanel>
          <NavigationSection />
        </ActionPanel>
      }
    >
      {listState === "all" && (
        <List.Section title={StateToTitle.whitelisted} subtitle={`${whitelistedAppNames?.length} apps`}>
          {whitelist?.map(({ isWhitelisted, name }, index) => (
            <ListItem
              key={`${index} - ${name}`}
              isWhitelisted={isWhitelisted}
              name={name}
              closeAppsAction={closeAllNonWhitelisted}
              refreshAction={revalidate}
              toggleWhitelistAction={toggleWhitelist}
              navigationComponent={<NavigationSection />}
            />
          ))}
        </List.Section>
      )}
      <List.Section title={StateToTitle[listState]} subtitle={`${apps?.length} apps`}>
        {apps?.map(({ isWhitelisted, name }, index) => (
          <ListItem
            key={`${index} - ${name}`}
            isWhitelisted={isWhitelisted}
            name={name}
            closeAppsAction={closeAllNonWhitelisted}
            refreshAction={revalidate}
            toggleWhitelistAction={toggleWhitelist}
            navigationComponent={<NavigationSection />}
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
