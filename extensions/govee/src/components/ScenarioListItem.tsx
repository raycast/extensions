import { Action, ActionPanel, Icon, List, confirmAlert } from "@raycast/api";

import type { Scenario, ScenariosHook } from "@/types";

import ScenarioDebug from "@/components/ScenarioDebug";
import ScenarioForm from "@/components/ScenarioForm";

import { wait } from "@/utils";

export type ScenarioListItemProps = {
  scenario: Scenario;
  scenariosHook: ScenariosHook;
  availableDeviceNames: Record<string, string>;
  execute: () => void;
};

const ScenarioListItem = ({ scenario, scenariosHook, availableDeviceNames, execute }: ScenarioListItemProps) => {
  const howManyDevicesOnline = scenario.devices.filter(({ id }) => id in availableDeviceNames).length;

  return (
    <List.Item
      title={scenario.title}
      icon={scenario.icon ? Icon[scenario.icon] : Icon.Play}
      accessories={[
        {
          tag: `${howManyDevicesOnline}/${scenario.devices.length} devices`,
          tooltip: "Number of devices in this scenario",
          icon: howManyDevicesOnline === scenario.devices.length ? Icon.Checkmark : Icon.Xmark,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Execute">
            <Action title="Execute" icon={Icon.Play} onAction={execute} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Edit">
            <Action.Push
              title="Edit"
              icon={Icon.Pencil}
              target={
                <ScenarioForm
                  id={scenario.id}
                  scenariosHook={scenariosHook}
                  availableDeviceNames={availableDeviceNames}
                />
              }
              shortcut={{ key: "e", modifiers: ["cmd", "ctrl"] }}
            />
            <Action
              title="Duplicate"
              icon={Icon.Duplicate}
              onAction={async () => {
                scenariosHook.duplicateScenario(scenario.id);
                await wait(100); // Wait for the new scenario to be created
                await scenariosHook.revalidate();
              }}
              shortcut={{ key: "d", modifiers: ["cmd"] }}
            />
            <Action
              title="Delete"
              icon={Icon.Trash}
              onAction={async () => {
                if (await confirmAlert({ title: "Are you sure?" })) {
                  scenariosHook.deleteScenario(scenario.id);
                }
              }}
              shortcut={{ key: "backspace", modifiers: ["cmd"] }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Scenarios">
            <Action.Push
              title="Create New Scenario"
              target={
                <ScenarioForm newScenario scenariosHook={scenariosHook} availableDeviceNames={availableDeviceNames} />
              }
              icon={Icon.Plus}
              shortcut={{ key: "s", modifiers: ["cmd", "ctrl"] }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Debug">
            <Action.Push
              title="Show Debug Info"
              target={<ScenarioDebug scenario={scenario} />}
              icon={Icon.Bug}
              shortcut={{ key: "d", modifiers: ["cmd"] }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export default ScenarioListItem;
