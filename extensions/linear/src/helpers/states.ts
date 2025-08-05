import { WorkflowState } from "@linear/sdk";
import { Image } from "@raycast/api";
import { groupBy } from "lodash";

import { IssueState } from "../api/getIssues";

type IconAsset = {
  light: Image.Asset;
  dark: Image.Asset;
};

export enum StateType {
  triage = "triage",
  backlog = "backlog",
  unstarted = "unstarted",
  started = "started",
  completed = "completed",
  canceled = "canceled",
}

export const statusIcons: Record<string, IconAsset> = {
  [StateType.triage]: { light: "light/triage.svg", dark: "dark/triage.svg" },
  [StateType.backlog]: { light: "light/backlog.svg", dark: "dark/backlog.svg" },
  [StateType.unstarted]: { light: "light/unstarted.svg", dark: "dark/unstarted.svg" },
  [StateType.started]: { light: "light/started.svg", dark: "dark/started.svg" },
  [StateType.completed]: { light: "light/completed.svg", dark: "dark/completed.svg" },
  [StateType.canceled]: { light: "light/canceled.svg", dark: "dark/canceled.svg" },
};

export function getStatusIcon(state: Pick<WorkflowState, "type" | "color">) {
  return {
    source: statusIcons[state.type],
    tintColor: { light: state.color, dark: state.color, adjustContrast: true },
  };
}

export function getOrderedStates(
  states: IssueState[],
  orderedStateTypes: StateType[] = [
    StateType.triage,
    StateType.backlog,
    StateType.unstarted,
    StateType.started,
    StateType.completed,
    StateType.canceled,
  ],
) {
  if (states.length === 0) {
    return [];
  }

  const groupedStatesByType = groupBy(states, (state) => state.type);

  return orderedStateTypes
    .filter((type) => !!groupedStatesByType[type])
    .map((type) => groupedStatesByType[type])
    .flat();
}
