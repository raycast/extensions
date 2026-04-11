import { ListStateMachinesCommand, SFNClient, StateMachineListItem, StateMachineType } from "@aws-sdk/client-sfn"; // ES Modules import
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AwsMfaRoleDropdown from "./components/searchbar/aws-mfa-role-dropdown";
import { resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";
import { MfaPrompt, useMfaGuard } from "./components/MfaPrompt";

export default function StepFunctions() {
  const { needsMfa, isLoading: mfaLoading, activeRole, revalidate: revalidateMfa } = useMfaGuard();
  const { data: stateMachineListItems, error, isLoading, revalidate } = useCachedPromise(fetchStateMachines);

  if (mfaLoading) {
    return <List isLoading={true} />;
  }

  if (needsMfa) {
    return (
      <MfaPrompt
        roleId={activeRole}
        onSuccess={() => {
          revalidateMfa();
          revalidate();
        }}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter state machines by name..."
      searchBarAccessory={<AwsMfaRoleDropdown onRoleSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
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
