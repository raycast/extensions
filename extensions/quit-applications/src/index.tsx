import { useState, useEffect, useCallback } from "react";
import { List, Color, Alert, Action, ActionPanel, confirmAlert, showToast, Toast } from "@raycast/api";

import * as scripts from "./scripts";
import { exec, common, widget } from "./utils";

import { type Application, type State, type ConfirmActionType, ConfirmActionTypes } from "./types";

import { CancelledByUserError } from "./errors";

function getAccessoryByActionState(actionType: ConfirmActionType): List.Item.Accessory[] {
  switch (actionType) {
    case ConfirmActionTypes.RESTART: {
      return [
        {
          text: {
            value: "Restarting",
            color: Color.Blue,
          },
        },
      ];
    }

    case ConfirmActionTypes.QUIT: {
      return [
        {
          text: {
            value: "Quitting",
            color: Color.Orange,
          },
        },
      ];
    }

    case ConfirmActionTypes.FORCE_QUIT: {
      return [
        {
          text: {
            value: "Force Quitting",
            color: Color.Red,
          },
        },
      ];
    }

    default: {
      const _unreachable: never = actionType;
      throw new Error(`Unreachable action type: ${_unreachable}`);
    }
  }
}

function handleError(err: unknown): string | undefined {
  if (err instanceof CancelledByUserError) {
    return err.message;
  }

  if (err instanceof Error) {
    return err.message;
  }
}

async function handleConfirm(application: Application, actionType: ConfirmActionType): Promise<void> {
  const confirmation = await confirmAlert({
    title: `${actionType} ${application.name}`,
    message: `Are you sure you want to ${actionType}?`,
    primaryAction: {
      title: actionType,
      style: Alert.ActionStyle.Destructive,
    },
    dismissAction: {
      title: "Cancel",
      style: Alert.ActionStyle.Cancel,
    },
  });

  if (!confirmation) {
    throw new CancelledByUserError(`${actionType} cancelled`);
  }
}

async function handleRestartApplication(app: Application): Promise<void> {
  await handleConfirm(app, ConfirmActionTypes.RESTART);
  await exec.applescript(scripts.restartApplication(app.name));
}

async function handleQuitApplication(app: Application): Promise<void> {
  await handleConfirm(app, ConfirmActionTypes.QUIT);
  await exec.applescript(scripts.quitApplication(app.name));
}

async function handleForceQuitApplication(app: Application): Promise<void> {
  await handleConfirm(app, ConfirmActionTypes.FORCE_QUIT);
  await exec.shellWithOutput(`kill -9 ${app.pid}`);
}

async function loadUserApplications(): Promise<Application[]> {
  try {
    const output = await exec.applescript(scripts.dumpApplications());

    const data = output.split(",").map((item) => item.trim());

    const groups = common.clusterBy(data, 3);

    const applicationList = common.mapArrayToObject<string, Application>(groups, ["name", "pid", "path"]);

    const applications = applicationList
      .map(widget.fetchApplicationIcon)
      .sort(widget.sortApplicationsInAlphabeticalOrder);

    return applications;
  } catch (err) {
    return [];
  }
}

export default function Applist() {
  const [state, setState] = useState<State>({
    query: "",
    isLoading: false,
    applications: [],
  });

  const [quitQueue, setQuitQueue] = useState<Application[]>([]);
  const [forceQuitQueue, setForceQuitQueue] = useState<Application[]>([]);
  const [restartQueue, setForceRestartQueue] = useState<Application[]>([]);

  function addToQueue(application: Application, actionType: ConfirmActionType): void {
    switch (actionType) {
      case ConfirmActionTypes.RESTART: {
        setForceRestartQueue((queue) => [...queue, application]);
        break;
      }

      case ConfirmActionTypes.QUIT: {
        setQuitQueue((queue) => [...queue, application]);
        break;
      }

      case ConfirmActionTypes.FORCE_QUIT: {
        setForceQuitQueue((queue) => [...queue, application]);
        break;
      }

      default: {
        const _unreachable: never = actionType;
        throw new Error(`Unreachable action type: ${_unreachable}`);
      }
    }
  }

  function removeFromQueue(application: Application, actionType: ConfirmActionType): void {
    switch (actionType) {
      case ConfirmActionTypes.RESTART: {
        setForceRestartQueue((queue) => queue.filter((item) => item.pid !== application.pid));
        break;
      }

      case ConfirmActionTypes.QUIT: {
        setQuitQueue((queue) => queue.filter((item) => item.pid !== application.pid));
        break;
      }

      case ConfirmActionTypes.FORCE_QUIT: {
        setForceQuitQueue((queue) => queue.filter((item) => item.pid !== application.pid));
        break;
      }

      default: {
        const _unreachable: never = actionType;
        throw new Error(`Unreachable action type: ${_unreachable}`);
      }
    }
  }

  function isInQueue(application: Application, actionType: ConfirmActionType): boolean {
    switch (actionType) {
      case ConfirmActionTypes.RESTART: {
        return restartQueue.some((item) => item.pid === application.pid);
      }

      case ConfirmActionTypes.QUIT: {
        return quitQueue.some((item) => item.pid === application.pid);
      }

      case ConfirmActionTypes.FORCE_QUIT: {
        return forceQuitQueue.some((item) => item.pid === application.pid);
      }

      default: {
        const _unreachable: never = actionType;
        throw new Error(`Unreachable action type: ${_unreachable}`);
      }
    }
  }

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

  const quitApplication = useCallback(
    async (application: Application) => {
      try {
        setLoadingState(true);
        addToQueue(application, ConfirmActionTypes.QUIT);

        await showToast({
          title: "Quitting Application",
          style: Toast.Style.Animated,
        });

        await handleQuitApplication(application);
        await hydrateApplications();

        await showToast({
          title: `Closed ${application.name}`,
          style: Toast.Style.Success,
        });
      } catch (err) {
        await showToast({
          title: `Unable to quit ${application.name}`,
          message: handleError(err),
          style: Toast.Style.Failure,
        });
      }

      removeFromQueue(application, ConfirmActionTypes.QUIT);
      setLoadingState(false);
    },
    [setLoadingState, hydrateApplications]
  );

  const restartApplication = useCallback(
    async (application: Application) => {
      try {
        setLoadingState(true);
        addToQueue(application, ConfirmActionTypes.RESTART);

        await showToast({
          title: `Restarting ${application.name}`,
          style: Toast.Style.Animated,
        });

        await handleRestartApplication(application);
        await hydrateApplications();

        await showToast({
          title: `Restarted ${application.name}`,
          style: Toast.Style.Success,
        });
      } catch (err) {
        await showToast({
          title: `Unable to restart ${application.name}`,
          message: handleError(err),
          style: Toast.Style.Failure,
        });
      }

      removeFromQueue(application, ConfirmActionTypes.RESTART);
      setLoadingState(false);
    },
    [setLoadingState, hydrateApplications]
  );

  const forceQuitApplication = useCallback(
    async (application: Application) => {
      try {
        setLoadingState(true);
        addToQueue(application, ConfirmActionTypes.FORCE_QUIT);

        await showToast({
          title: `Forcing ${application.name} to quit`,
          style: Toast.Style.Animated,
        });

        await handleForceQuitApplication(application);
        await hydrateApplications();

        await showToast({
          title: `Forced ${application.name} to quit`,
          style: Toast.Style.Success,
        });
      } catch (err) {
        await showToast({
          title: `Unable to force ${application.name} to quit`,
          message: handleError(err),
          style: Toast.Style.Failure,
        });
      }

      removeFromQueue(application, ConfirmActionTypes.FORCE_QUIT);
      setLoadingState(false);
    },
    [hydrateApplications, setLoadingState]
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
        const isRestarting = isInQueue(application, ConfirmActionTypes.RESTART);
        const isQuitting = isInQueue(application, ConfirmActionTypes.QUIT);
        const isForceQuitting = isInQueue(application, ConfirmActionTypes.FORCE_QUIT);

        const accessories = [
          ...(isRestarting ? getAccessoryByActionState(ConfirmActionTypes.RESTART) : []),
          ...(isQuitting ? getAccessoryByActionState(ConfirmActionTypes.QUIT) : []),
          ...(isForceQuitting ? getAccessoryByActionState(ConfirmActionTypes.FORCE_QUIT) : []),
        ];

        return (
          <List.Item
            key={application.pid}
            title={application.name}
            icon={{
              fileIcon: application.fileIcon,
            }}
            accessories={accessories}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action title="Quit" onAction={() => quitApplication(application)} />
                  <Action title="Force Quit" onAction={() => forceQuitApplication(application)} />
                </ActionPanel.Section>

                <Action
                  title="Restart"
                  shortcut={{
                    modifiers: ["cmd", "opt"],
                    key: "r",
                  }}
                  onAction={() => restartApplication(application)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
