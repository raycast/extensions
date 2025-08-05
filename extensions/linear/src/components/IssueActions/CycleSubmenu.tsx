import { Action, ActionPanel } from "@raycast/api";
import { useState } from "react";

import { IssueResult } from "../../api/getIssues";
import { getLinearClient } from "../../api/linearClient";
import { formatCycle, FormattedCycle, getCycleOptions } from "../../helpers/cycles";
import useCycles from "../../hooks/useCycles";

import { UpdateIssueParams } from "./IssueActions";

export default function CycleSubmenus({
  issue,
  updateIssue,
}: {
  issue: IssueResult;
  updateIssue: (params: UpdateIssueParams) => void;
}) {
  const { linearClient } = getLinearClient();

  const [load, setLoad] = useState(false);
  const { cycles, isLoadingCycles } = useCycles(issue.team.id, { execute: load });

  const currentCycle = issue.cycle ? formatCycle(issue.cycle) : null;
  const isInActiveCycle = currentCycle?.isActive || false;
  const isInNextCycle = currentCycle?.isNext || false;

  async function moveToCycle(cycle: FormattedCycle | null) {
    const currentCycle = issue.cycle;
    updateIssue({
      animatedTitle: "Moving to cycle",
      payload: { cycleId: cycle?.id || null },
      optimisticUpdate(issue) {
        return {
          ...issue,
          cycle: cycle || undefined,
        };
      },
      rollbackUpdate(issue) {
        return {
          ...issue,
          cycle: currentCycle,
        };
      },
      successTitle: cycle ? "Moved to cycle" : "Removed from cycle",
      successMessage: cycle?.title ? cycle.title : "",
      errorTitle: "Failed to move to cycle",
    });
  }

  async function moveToNextCycle() {
    const { nodes } = await linearClient.cycles({ filter: { team: { id: { eq: issue.team.id } } } });
    const cycleOptions = getCycleOptions(nodes || []);
    const activeCycleIndex = cycleOptions.findIndex((cycle) => cycle.isActive);
    const activeCycle = activeCycleIndex > -1 ? cycleOptions[activeCycleIndex] : null;
    const nextCycle = activeCycle ? cycleOptions[activeCycleIndex + 1] : null;

    if (!nextCycle) {
      return;
    }
    return moveToCycle(nextCycle);
  }

  async function moveToActiveCycle() {
    const { nodes } = await linearClient.cycles({ filter: { team: { id: { eq: issue.team.id } } } });
    const cycleOptions = getCycleOptions(nodes || []);
    const activeCycle = cycleOptions.find((cycle) => cycle.isActive);

    if (!activeCycle) {
      return;
    }
    return moveToCycle(activeCycle);
  }

  return (
    <>
      <ActionPanel.Submenu
        title="Move to Cycle"
        icon={{ source: { light: "light/cycle.svg", dark: "dark/cycle.svg" } }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        onOpen={() => setLoad(true)}
      >
        <Action
          title="No Cycle"
          icon={{ source: { light: "light/no-cycle.svg", dark: "dark/no-cycle.svg" } }}
          onAction={() => moveToCycle(null)}
        />

        {!cycles && isLoadingCycles ? (
          <Action title="Loading…" />
        ) : (
          getCycleOptions(cycles || []).map((cycle) => (
            <Action
              key={cycle.id}
              autoFocus={cycle.id === currentCycle?.id}
              title={cycle.title}
              icon={{ source: cycle.icon }}
              onAction={() => moveToCycle(cycle)}
            />
          ))
        )}
      </ActionPanel.Submenu>

      {!isInActiveCycle ? (
        <Action
          title="Move to Active Cycle"
          icon={{ source: { light: "light/active-cycle.svg", dark: "dark/active-cycle.svg" } }}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "c" }}
          onAction={() => moveToActiveCycle()}
        />
      ) : null}

      {!isInNextCycle ? (
        <Action
          title="Move to Next Cycle"
          icon={{ source: { light: "light/cycle.svg", dark: "dark/cycle.svg" } }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          onAction={() => moveToNextCycle()}
        />
      ) : null}
    </>
  );
}
