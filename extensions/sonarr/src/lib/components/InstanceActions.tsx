import { Action, ActionPanel, Icon, openExtensionPreferences } from "@raycast/api";
import type { InstanceState } from "@/lib/types/instance";
import { Shortcuts } from "@/lib/utils/shortcuts";

interface InstanceActionsProps {
  state: InstanceState;
}

/**
 * Instance section shared by every command: switching targets from here is what
 * makes the choice stick across commands, since it writes the selection the
 * `useInstance` hook reads back.
 */
export function InstanceActions({ state }: InstanceActionsProps) {
  const inactiveInstances = state.instances.filter((candidate) => candidate.id !== state.instance?.id);

  return (
    <ActionPanel.Section title="Instance">
      {inactiveInstances.map((instance, index) => (
        <Action
          key={instance.id}
          title={`Switch to ${instance.name}`}
          icon={Icon.Switch}
          onAction={() => state.switchToInstance(instance)}
          // Only the first alternative gets the shortcut: with the two
          // instances the preferences allow, that is always the other one.
          shortcut={index === 0 ? Shortcuts.switchInstance : undefined}
        />
      ))}
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel.Section>
  );
}
