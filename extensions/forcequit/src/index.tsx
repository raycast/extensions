import { promisify } from "util";
import { exec } from "child_process";
import { useState, useEffect, useCallback } from "react";
import {
  Icon,
  List,
  Alert,
  Action,
  ActionPanel,
  confirmAlert,
  showToast,
  Toast,
} from "@raycast/api";

import { type Application } from "./types";

import { toBase64, clusterBy, mapArrayToObject } from "./utils";

import dumpScript from "./scripts/dump-applications";

type State = {
  query: string;
  isLoading: boolean;
  applications: Application[];
};

const execASync = promisify(exec);

function sortApplicationsInAlphabeticalOrder<
  T extends Pick<Application, "name">
>(a: T, b: T): number {
  if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) return -1;
  if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) return 1;

  return 0;
}

function fetchApplicationIcon<T extends Omit<Application, "icon">>(
  application: T
): Application {
  const [applicationPath] = application.path.split("Contents");

  if (applicationPath.includes(".app")) {
    return {
      ...application,
      fileIcon: applicationPath,
    };
  }

  return {
    ...application,
    fileIcon: application.name,
  };
}

async function loadUserApplications(): Promise<Application[]> {
  try {
    const dumpScriptBase64 = toBase64(dumpScript);

    const { stdout } = await execASync(
      `echo "${dumpScriptBase64}" | base64 --decode | osascript`
    );

    const data = stdout.split(",").map((item) => item.trim());

    const groups = clusterBy(data, 3);

    const applicationList = mapArrayToObject<string, Application>(groups, [
      "name",
      "pid",
      "path",
    ]);

    const applications = applicationList
      .map(fetchApplicationIcon)
      .sort(sortApplicationsInAlphabeticalOrder);

    return applications;
  } catch (err) {
    return [];
  }
}

export default function Command() {
  const [state, setState] = useState<State>({
    query: "",
    isLoading: false,
    applications: [],
  });

  const setLoadingState = useCallback(
    (isLoading: boolean) => {
      setState((state) => ({ ...state, isLoading }));
    },
    [setState]
  );

  const handleSearchTextChange = useCallback(
    (query: string) => {
      setState((state) => ({ ...state, query }));
    },
    [setState]
  );

  const hydrateApplications = useCallback(async function () {
    setLoadingState(true);
    const applications = await loadUserApplications();

    setState((state) => ({ ...state, applications }));
    setLoadingState(false);
  }, []);

  const closeApplication = useCallback(
    async (application: Application) => {
      try {
        const confirmation = await confirmAlert({
          title: "Force Quit",
          message: `Are you sure you want to force quit ${application.name}?`,
          icon: Icon.XMarkCircle,
          primaryAction: {
            title: "Force Quit",
            style: Alert.ActionStyle.Destructive,
          },
          dismissAction: {
            title: "Cancel",
            style: Alert.ActionStyle.Cancel,
          },
        });

        if (!confirmation) return;

        await showToast({
          title: "Closing Application",
          style: Toast.Style.Animated,
        });

        await execASync(`kill -9 ${application.pid}`);
        await hydrateApplications();

        await showToast({
          title: "Application Closed",
          style: Toast.Style.Success,
        });
      } catch (err) {
        await showToast({
          title: `Unable to close ${application.name}`,
          message: err instanceof Error ? err.message : "Something went wrong",
          style: Toast.Style.Failure,
        });
      }
    },
    [hydrateApplications]
  );

  useEffect(() => {
    hydrateApplications();
  }, []);

  return (
    <List
      filtering={true}
      isLoading={state.isLoading}
      searchText={state.query}
      onSearchTextChange={handleSearchTextChange}
    >
      {state.applications.map((application) => {
        return (
          <List.Item
            key={application.pid}
            title={application.name}
            icon={{
              fileIcon: application.fileIcon,
            }}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title={`Force Quit ${application.name}`}
                    icon={{
                      fileIcon: application.fileIcon,
                    }}
                    onAction={() => closeApplication(application)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
