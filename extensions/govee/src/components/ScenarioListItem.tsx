import { colord } from "colord";
import type { ReactNode } from "react";

import { Action, ActionPanel, Icon, Keyboard, List, confirmAlert } from "@raycast/api";

import type { Scenario, ScenariosHook } from "@/types";

import ScenarioDebug from "@/components/ScenarioDebug";
import ScenarioForm from "@/components/ScenarioForm";

export type ScenarioListItemProps = {
  scenario: Scenario;
  scenariosHook: ScenariosHook;
  availableDeviceNames: Record<string, string>;
  execute: () => void;
  layoutActions?: ReactNode;
};

function getQuickLinkForApp(scenarioId: string): string {
  const context = JSON.stringify({ scenario: scenarioId });
  const encodedContext = encodeURIComponent(context);
  return `${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/j3lte/govee/control-govee-lights?context=${encodedContext}`;
}

const ScenarioListItem = ({
  scenario,
  scenariosHook,
  availableDeviceNames,
  execute,
  layoutActions,
}: ScenarioListItemProps) => {
  // What each device will get: its own setting, else the scenario's "all devices" one (as execScenario does).
  const effective = <K extends "brightness" | "color">(key: K) =>
    scenario.devices.map((d) => d.scenario?.[key] ?? scenario.all?.[key] ?? null).filter((v) => v !== null);
  const brightnesses = [...new Set(effective("brightness"))];
  const colors = [...new Set(effective("color").map((c) => colord(c).toHex()))];

  return (
    <List.Item
      title={scenario.title}
      // Typing a light's name also finds the scenarios that use it.
      keywords={scenario.devices.map(({ id }) => availableDeviceNames[id]).filter(Boolean)}
      icon={scenario.icon ? Icon[scenario.icon] : Icon.CircleFilled}
      accessories={[
        // Left to right on every row type: colour circle(s), brightness, device tag(s) at the far right.
        ...colors.map((c) => ({ icon: { source: "circle.svg", tintColor: c }, tooltip: "Color this scenario sets" })),
        ...(brightnesses.length
          ? [{ tag: brightnesses.map((b) => `${b}%`).join(" / "), tooltip: "Brightness this scenario sets" }]
          : []),
        // One tag per device it affects; ✗ marks a device that isn't found right now.
        ...scenario.devices.map(({ id }) =>
          id in availableDeviceNames
            ? { tag: availableDeviceNames[id], tooltip: "Affects this device" }
            : { tag: "Offline device", icon: Icon.Xmark, tooltip: `Device ${id} not found` },
        ),
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Execute">
            <Action title="Execute" icon={Icon.Play} onAction={execute} />
          </ActionPanel.Section>
          {layoutActions}
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
              shortcut={Keyboard.Shortcut.Common.Edit}
            />
            <Action
              title="Duplicate"
              icon={Icon.Duplicate}
              onAction={async () => {
                scenariosHook.duplicateScenario(scenario.id);
              }}
              shortcut={Keyboard.Shortcut.Common.Duplicate}
            />
            <Action
              title="Delete"
              icon={Icon.Trash}
              onAction={async () => {
                if (await confirmAlert({ title: "Are you sure?" })) {
                  scenariosHook.deleteScenario(scenario.id);
                }
              }}
              shortcut={Keyboard.Shortcut.Common.Remove}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Quicklinks">
            <Action.CreateQuicklink
              title="Create Quicklink"
              shortcut={{ key: "l", modifiers: ["cmd", "shift"] }}
              quicklink={{ link: getQuickLinkForApp(scenario.id), name: `Execute Govee Scenario: "${scenario.title}"` }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Scenarios">
            <Action.Push
              title="Create New Scenario"
              target={
                <ScenarioForm newScenario scenariosHook={scenariosHook} availableDeviceNames={availableDeviceNames} />
              }
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Debug">
            <Action.Push
              title="Show Debug Info"
              target={<ScenarioDebug scenario={scenario} />}
              icon={Icon.Bug}
              shortcut={{ key: "i", modifiers: ["cmd"] }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export default ScenarioListItem;
