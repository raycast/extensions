import { StateMachineListItem, SFNClient, ListStateMachinesCommand } from "@aws-sdk/client-sfn"; // ES Modules import
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "./util";

export default function StepFunctions() {
  const { data: stateMachineListItems, error, isLoading, revalidate } = useCachedPromise(fetchFunctions);
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter functions by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        stateMachineListItems?.map((stateMachineListItem) => (
          <StepFunction key={stateMachineListItem.name} stateMachineListItem={stateMachineListItem} />
        ))
      )}
    </List>
  );
}

function StepFunction({ stateMachineListItem }: { stateMachineListItem: StateMachineListItem }) {
  return (
    <List.Item
      icon={"aws-icons/states.png"}
      title={stateMachineListItem.name || ""}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={resourceToConsoleLink(stateMachineListItem.stateMachineArn, "AWS::StepFunctions::StateMachine")}
          />
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy Function ARN" content={stateMachineListItem.stateMachineArn || ""} />
            <Action.CopyToClipboard title="Copy Function Name" content={stateMachineListItem.name || ""} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function fetchFunctions(
  nextMarker?: string,
  stateMachinesOfTotal?: StateMachineListItem[],
): Promise<StateMachineListItem[]> {
  const client = new SFNClient({});
  const command = new ListStateMachinesCommand({ nextToken: nextMarker });
  const { nextToken, stateMachines } = await client.send(command);
  const combinedFunctions = [...(stateMachinesOfTotal || []), ...(stateMachines || [])];
  if (nextToken) {
    return fetchFunctions(nextToken, combinedFunctions);
  }
  return combinedFunctions;
}
