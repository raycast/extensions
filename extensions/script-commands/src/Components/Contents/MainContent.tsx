import { ActionPanel, List } from "@raycast/api";

import { ClearFilterActionItem, GroupSection } from "@components";

import { useScriptCommands } from "@hooks";

export function MainContent(): JSX.Element {
  const { props, setFilter, setSelection, installPackage } = useScriptCommands();

  return (
    <List
      isLoading={props.isLoading}
      searchBarPlaceholder={props.placeholder}
      onSelectionChange={setSelection}
      children={props.groups.map((group) => (
        <GroupSection key={group.identifier} group={group} onInstallPackage={() => installPackage(group)} />
      ))}
      actions={
        <ActionPanel title="Filter by">
          {props.filter != null && props.totalScriptCommands == 0 && <ClearFilterActionItem onFilter={setFilter} />}
        </ActionPanel>
      }
    />
  );
}
