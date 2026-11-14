import { useCachedPromise } from "@raycast/utils";
import { XcodeSimulatorService } from "../../services/xcode-simulator.service";
import { XcodeSimulatorStateDropdown } from "./xcode-simulator-list-dropdown.component";
import { List } from "@raycast/api";
import { XcodeSimulatorListItem } from "./xcode-simulator-list-item.component";
import { useState, useMemo } from "react";
import { XcodeSimulatorStateFilter } from "../../models/xcode-simulator/xcode-simulator-state-filter.model";
import { XcodeSimulatorState } from "../../models/xcode-simulator/xcode-simulator-state.model";

/**
 * Maximum number of simulators shown in the "Recently Used" section.
 * Keeps the section short instead of gradually mirroring "All Simulators".
 */
const MAX_RECENTLY_USED_SIMULATORS = 5;

export function XcodeSimulatorList() {
  const [simulatorStateFilter, setSimulatorStateFilter] = useState<XcodeSimulatorStateFilter>(
    XcodeSimulatorStateFilter.all
  );
  const xcodeSimulatorGroups = useCachedPromise(XcodeSimulatorService.xcodeSimulatorGroups, [simulatorStateFilter]);

  const onSimulatorStateFilterChange = (newValue: XcodeSimulatorStateFilter) => {
    setSimulatorStateFilter(newValue);
  };

  // Flatten all simulators from all groups
  const allSimulators = useMemo(() => {
    return xcodeSimulatorGroups.data?.flatMap((group) => group.simulators) ?? [];
  }, [xcodeSimulatorGroups.data]);

  // Split into booted, recently used (capped) and the rest
  const { bootedSimulators, recentlyUsedSimulators, otherSimulators } = useMemo(() => {
    const booted = allSimulators.filter((sim) => sim.state === XcodeSimulatorState.booted);
    const notBooted = allSimulators.filter((sim) => sim.state !== XcodeSimulatorState.booted);
    const recentlyUsed = notBooted
      .filter((sim) => (sim.lastUsed ?? 0) > 0)
      .sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0))
      .slice(0, MAX_RECENTLY_USED_SIMULATORS);
    const recentlyUsedUdids = new Set(recentlyUsed.map((sim) => sim.udid));
    const others = notBooted.filter((sim) => !recentlyUsedUdids.has(sim.udid));

    return {
      bootedSimulators: booted,
      recentlyUsedSimulators: recentlyUsed,
      otherSimulators: others,
    };
  }, [allSimulators]);

  return (
    <List
      isLoading={xcodeSimulatorGroups.isLoading}
      searchBarAccessory={<XcodeSimulatorStateDropdown onSimulatorStateFilterChange={onSimulatorStateFilterChange} />}
    >
      {bootedSimulators.length > 0 && (
        <List.Section title="Booted" key="booted">
          {bootedSimulators.map((xcodeSimulator) => (
            <XcodeSimulatorListItem
              key={xcodeSimulator.udid}
              simulator={xcodeSimulator}
              revalidate={xcodeSimulatorGroups.revalidate}
            />
          ))}
        </List.Section>
      )}

      {recentlyUsedSimulators.length > 0 && (
        <List.Section title="Recently Used" key="recently-used">
          {recentlyUsedSimulators.map((xcodeSimulator) => (
            <XcodeSimulatorListItem
              key={xcodeSimulator.udid}
              simulator={xcodeSimulator}
              revalidate={xcodeSimulatorGroups.revalidate}
            />
          ))}
        </List.Section>
      )}

      {otherSimulators.length > 0 && (
        <List.Section title="All Simulators" key="all">
          {otherSimulators.map((xcodeSimulator) => (
            <XcodeSimulatorListItem
              key={xcodeSimulator.udid}
              simulator={xcodeSimulator}
              revalidate={xcodeSimulatorGroups.revalidate}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
