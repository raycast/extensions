import { showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { execFile, spawn } from "child_process";
import { createInterface } from "readline";
import { promisify } from "util";
import { useEffect, useMemo, useRef, useState } from "react";
import { DockerContainer, DOCKER, DOCKER_CONTAINER_REFRESH_EVENTS, dockerArgs, parseDockerPsOutput } from "./docker";
import { OrbMachine, OrbMachineInfo, ORB_CTL } from "./orbstack";

const execFileAsync = promisify(execFile);
const CONTAINER_POLL_MS = 1000;

type MachineState = "running" | "stopped" | "stopping";

interface StateTransition {
  id: string;
  currentState: string;
  requestedState: MachineState;
}

function createStateTransition(machine: OrbMachine, requestedState: MachineState): StateTransition {
  return {
    id: machine.id,
    currentState: machine.state,
    requestedState,
  };
}

function shouldExecute(st: StateTransition | null): boolean {
  if (st === null) {
    return false;
  }
  if (st.currentState === "stopped" && st.requestedState === "running") {
    return true;
  }
  if (st.currentState === "running" && st.requestedState === "stopped") {
    return true;
  }
  return false;
}

function stateTransitionCommand(st: StateTransition | null): string[] {
  if (st === null) {
    return [];
  }
  if (st.requestedState === "running") {
    return ["start", st.id];
  } else if (st.requestedState === "stopped") {
    return ["stop", st.id];
  }
  return [];
}

function handleCommandError(error: Error, context: string) {
  showToast({
    title: `${context} Error`,
    message: error.message,
    style: Toast.Style.Failure,
  });
}

export function useMachineList() {
  const {
    data: machineListData,
    isLoading: isLoadingMachineList,
    revalidate: revalidateMachineList,
  } = useExec(ORB_CTL, ["list", "--format", "json"], {
    onError: (e) => handleCommandError(e, "Machine List"),
  });

  const machines: OrbMachine[] = useMemo(() => {
    if (machineListData) {
      try {
        return JSON.parse(machineListData) as OrbMachine[];
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        showToast({
          title: "Error",
          message: "Failed to parse machine list",
          style: Toast.Style.Failure,
        });
      }
    }
    return [];
  }, [machineListData]);

  return { machines, isLoadingMachineList, revalidateMachineList };
}

export function useMachineStateTransition(onComplete?: () => void) {
  const [stateTransition, setStateTransition] = useState<StateTransition | null>(null);

  const { isLoading: isTransitioningState } = useExec(ORB_CTL, stateTransitionCommand(stateTransition), {
    execute: shouldExecute(stateTransition),
    onData: () => {
      setStateTransition(null);
      onComplete?.();
    },
    onError: (e) => {
      setStateTransition(null);
      onComplete?.();
      handleCommandError(e, "State Transition");
    },
  });

  const startTransition = (machine: OrbMachine, targetState: MachineState) => {
    setStateTransition(createStateTransition(machine, targetState));
  };

  return { isTransitioningState, startTransition };
}

export function useMachineInfo(machineName: string | null) {
  const { isLoading: isLoadingMachineInfo, data: machineData } = useExec(
    ORB_CTL,
    ["info", machineName ?? "", "--format", "json"],
    {
      execute: machineName !== null,
      onError: (e) => handleCommandError(e, "Machine Info"),
    },
  );

  const machineInfo: OrbMachineInfo | null = useMemo(() => {
    if (machineData) {
      try {
        return JSON.parse(machineData) as OrbMachineInfo;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        showToast({
          title: "Error",
          message: "Failed to parse machine info",
          style: Toast.Style.Failure,
        });
      }
    }
    return null;
  }, [machineData]);

  return { machineInfo, isLoadingMachineInfo };
}

export function useMachineToggleAll(onComplete?: () => void) {
  const [toggleCommand, setToggleCommand] = useState<string[] | null>(null);

  const { isLoading: isTogglingAll } = useExec(ORB_CTL, toggleCommand || [], {
    execute: toggleCommand !== null,
    onData: () => {
      setToggleCommand(null);
      onComplete?.();
    },
    onError: (e) => {
      setToggleCommand(null);
      onComplete?.();
      handleCommandError(e, "Toggle All Machines");
    },
  });

  const startAll = () => {
    setToggleCommand(["start", "--all"]);
  };

  const stopAll = () => {
    setToggleCommand(["stop", "--all"]);
  };

  return { isTogglingAll, startAll, stopAll };
}

export type ContainerAction = "start" | "stop" | "restart";

type ContainerOverlay = Partial<Pick<DockerContainer, "State" | "Status">>;

/**
 * OrbStack / Docker do not push into Raycast. While Container List is open we
 * subscribe to `docker events` and also poll — same feel as the Docker extension.
 */
function useDockerContainerEvents(onEvent: () => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const child = spawn(DOCKER, dockerArgs("events", "--filter", "type=container", "--format", "{{json .}}"), {
      env: process.env,
    });

    const rl = createInterface({ input: child.stdout });
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleRefresh = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        onEventRef.current();
      }, 250);
    };

    rl.on("line", (line) => {
      try {
        const event = JSON.parse(line) as { status?: string };
        if (event.status && DOCKER_CONTAINER_REFRESH_EVENTS.has(event.status.split(":")[0] ?? "")) {
          scheduleRefresh();
        }
      } catch {
        // ignore malformed event lines
      }
    });

    child.on("error", () => {
      // Socket down / docker missing — list still works via poll / manual refresh.
    });

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      rl.close();
      child.kill();
    };
  }, []);
}

function useContainerPoll(revalidate: () => void) {
  const revalidateRef = useRef(revalidate);
  revalidateRef.current = revalidate;

  useEffect(() => {
    const interval = setInterval(() => {
      revalidateRef.current();
    }, CONTAINER_POLL_MS);

    return () => clearInterval(interval);
  }, []);
}

async function dockerExec(args: string[]) {
  await execFileAsync(DOCKER, args, {
    timeout: 60_000,
    env: process.env,
  });
}

export function useContainerList() {
  const [overlays, setOverlays] = useState<Record<string, ContainerOverlay>>({});

  const {
    data: containerListData,
    isLoading: isLoadingContainerList,
    revalidate: revalidateContainerList,
  } = useExec(DOCKER, dockerArgs("ps", "-a", "--format", "{{json .}}"), {
    keepPreviousData: true,
    onError: (e) => handleCommandError(e, "Container List"),
  });

  useDockerContainerEvents(revalidateContainerList);
  useContainerPoll(revalidateContainerList);

  useEffect(() => {
    // Fresh `docker ps` wins — drop optimistic overlays.
    setOverlays({});
  }, [containerListData]);

  const containers: DockerContainer[] = useMemo(() => {
    if (!containerListData) {
      return [];
    }

    try {
      return parseDockerPsOutput(containerListData).map((container) => {
        const overlay = overlays[container.ID];
        return overlay ? { ...container, ...overlay } : container;
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      showToast({
        title: "Error",
        message: "Failed to parse container list",
        style: Toast.Style.Failure,
      });
      return [];
    }
  }, [containerListData, overlays]);

  const applyOptimisticState = (id: string, overlay: ContainerOverlay) => {
    setOverlays((prev) => ({ ...prev, [id]: overlay }));
  };

  return {
    containers,
    isLoadingContainerList,
    revalidateContainerList,
    applyOptimisticState,
  };
}

export function useContainerAction(
  revalidate?: () => void,
  applyOptimisticState?: (id: string, overlay: ContainerOverlay) => void,
) {
  const [isRunningContainerAction, setIsRunningContainerAction] = useState(false);

  const runDockerAction = async (container: DockerContainer, args: string[], overlay?: ContainerOverlay) => {
    if (overlay) {
      applyOptimisticState?.(container.ID, overlay);
    }
    setIsRunningContainerAction(true);
    try {
      await dockerExec(args);
      revalidate?.();
    } finally {
      setIsRunningContainerAction(false);
    }
  };

  const startContainer = (container: DockerContainer) =>
    runDockerAction(container, dockerArgs("start", container.ID), {
      State: "running",
      Status: "Starting…",
    });

  const stopContainer = (container: DockerContainer) =>
    runDockerAction(container, dockerArgs("stop", container.ID), {
      State: "exited",
      Status: "Stopping…",
    });

  const restartContainer = (container: DockerContainer) =>
    runDockerAction(container, dockerArgs("restart", container.ID), {
      State: "running",
      Status: "Restarting…",
    });

  const removeContainer = (container: DockerContainer) => runDockerAction(container, dockerArgs("rm", container.ID));

  const stopAndRemoveContainer = async (container: DockerContainer) => {
    applyOptimisticState?.(container.ID, { State: "exited", Status: "Stopping…" });
    setIsRunningContainerAction(true);
    try {
      await dockerExec(dockerArgs("stop", container.ID));
      await dockerExec(dockerArgs("rm", container.ID));
      revalidate?.();
    } finally {
      setIsRunningContainerAction(false);
    }
  };

  return {
    isRunningContainerAction,
    startContainer,
    stopContainer,
    restartContainer,
    removeContainer,
    stopAndRemoveContainer,
  };
}
