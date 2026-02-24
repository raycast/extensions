import { showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useMemo, useState } from "react";
import { OrbMachine, OrbMachineInfo, ORB_CTL } from "./orbstack";

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
