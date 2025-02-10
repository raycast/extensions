import { ListStateMachinesCommand, SFNClient, StateMachineListItem, StateMachineType } from "@aws-sdk/client-sfn"; // ES Modules import
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";

export default function StepFunctions() {
  const { data: stateMachineListItems, error, isLoading, revalidate } = useCachedPromise(fetchStateMachines);
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter state machines by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        stateMachineListItems?.map((stateMachineListItem) => (
          <StateMachine key={stateMachineListItem.name} item={stateMachineListItem} />
        ))
      )}
    </List>
  );
}

function StateMachine({ item }: { item: StateMachineListItem }) {
  return (
    <List.Item
      icon={"aws-icons/states.png"}
      title={item.name || ""}
      accessories={[{ tag: item.type || StateMachineType.STANDARD }]}
      actions={
        <ActionPanel>
          <AwsAction.Console url={resourceToConsoleLink(item.stateMachineArn, "AWS::StepFunctions::StateMachine")} />
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy State Machine ARN" content={item.stateMachineArn || ""} />
            <Action.CopyToClipboard title="Copy State Machine Name" content={item.name || ""} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function fetchStateMachines(
  nextMarker?: string,
  aggregatedStateMachines?: StateMachineListItem[],
): Promise<StateMachineListItem[]> {
  const client = new SFNClient({});
  const command = new ListStateMachinesCommand({ nextToken: nextMarker });
  const { nextToken, stateMachines } = await client.send(command);
  const combinedStateMachines = [...(aggregatedStateMachines || []), ...(stateMachines || [])];
  if (nextToken) {
    return fetchStateMachines(nextToken, combinedStateMachines);
  }
  return combinedStateMachines;
}
