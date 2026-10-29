import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { CreateMachineForm } from "./components/create-machine-form";
import { MachineListItem } from "./components/machine-list-item";
import { UsageDetail } from "./components/usage-detail";
import { useMachines } from "./hooks/use-machines";
import { DOCS_URL } from "./services/instabox";
import { STATE_GROUPS, stateInfo } from "./utils/machine-state";
import { Shortcuts } from "./utils/shortcuts";

export default function ManageMachines() {
  const { data: machines, isLoading, revalidate: refresh, error } = useMachines();

  const generalActions = (
    <>
      <Action.Push
        title="Create Machine"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<CreateMachineForm onSubmitted={refresh} />}
      />
      <Action.Push
        title="View Usage and Limits"
        icon={Icon.Gauge}
        shortcut={Shortcuts.Usage}
        target={<UsageDetail />}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refresh}
      />
    </>
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search machines...">
      {error && !machines ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load machines"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={refresh} />
              <Action.OpenInBrowser title="Open InstaBox Docs" url={DOCS_URL} />
            </ActionPanel>
          }
        />
      ) : (
        !isLoading && (
          <List.EmptyView
            icon="extension-icon.png"
            title="No Machines Yet"
            description="Create a cloud computer for your agents."
            actions={<ActionPanel>{generalActions}</ActionPanel>}
          />
        )
      )}
      {STATE_GROUPS.map(({ group, title }) => {
        const items = (machines ?? []).filter((machine) => stateInfo(machine).group === group);
        if (items.length === 0) return null;
        return (
          <List.Section key={group} title={title} subtitle={String(items.length)}>
            {items.map((machine) => (
              <MachineListItem key={machine.id} machine={machine} onChange={refresh} />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
