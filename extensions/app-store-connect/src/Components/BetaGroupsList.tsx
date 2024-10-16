import { Icon, List, ActionPanel, Action, confirmAlert, Alert, Keyboard } from "@raycast/api";
import { useAppStoreConnectApi, fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { App, betaGroupsSchema, BetaGroup } from "../Model/schemas";
import { useEffect, useState } from "react";
import BetaGroupDetail from "./BetaGroupDetail";
import ExternalBetaGroupBuilds from "./InternalBetaGroupBuilds";
import CreateNewGroup from "./CreateNewGroup";
import { presentError } from "../Utils/utils";
interface BetaGroupsListProps {
  app: App;
}
export default function BetaGroupsList({ app }: BetaGroupsListProps) {
  const { data: betaGroups, isLoading: isLoadingBetaGroups } = useAppStoreConnectApi(
    `/betaGroups?filter[app]=${app.id}`,
    (response) => {
      return betaGroupsSchema.safeParse(response.data).data ?? null;
    },
  );
  const [externalGroups, setExternalGroups] = useState<BetaGroup[]>([]);
  const [internalGroups, setInternalGroups] = useState<BetaGroup[]>([]);

  useEffect(() => {
    if (betaGroups) {
      setExternalGroups(betaGroups.filter((betaGroup: BetaGroup) => !betaGroup.attributes.isInternalGroup));
      setInternalGroups(betaGroups.filter((betaGroup: BetaGroup) => betaGroup.attributes.isInternalGroup));
    }
  }, [betaGroups]);

  const didCreateNewGroup = (newGroup: BetaGroup) => {
    if (newGroup.attributes.isInternalGroup) {
      setInternalGroups([...internalGroups, newGroup]);
    } else {
      setExternalGroups([...externalGroups, newGroup]);
    }
  };

  const deleteGroup = async (group: BetaGroup) => {
    if (
      await confirmAlert({
        title: "Are you sure?",
        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
      })
    ) {
      if (group.attributes.isInternalGroup) {
        setInternalGroups(internalGroups.filter((betaGroup: BetaGroup) => betaGroup.id !== group.id));
      } else {
        setExternalGroups(externalGroups.filter((betaGroup: BetaGroup) => betaGroup.id !== group.id));
      }
      try {
        await fetchAppStoreConnect(`/betaGroups/${group.id}`, "DELETE");
      } catch (error) {
        presentError(error);
        if (group.attributes.isInternalGroup) {
          setInternalGroups([...internalGroups, group]);
        } else {
          setExternalGroups([...externalGroups, group]);
        }
      }
    }
  };

  const deleteGroupAction = (group: BetaGroup) => {
    return (
      <Action
        title="Delete Group"
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.Remove}
        icon={Icon.Trash}
        onAction={async () => {
          await deleteGroup(group);
        }}
      />
    );
  };

  const createNewGroupAction = () => {
    return (
      <Action.Push
        title="Create New Group"
        shortcut={Keyboard.Shortcut.Common.New}
        icon={Icon.AddPerson}
        target={<CreateNewGroup app={app} didCreateNewGroup={didCreateNewGroup} />}
      />
    );
  };

  return (
    <List isLoading={isLoadingBetaGroups} actions={<ActionPanel>{createNewGroupAction()}</ActionPanel>}>
      <List.Section title="Internal Groups">
        {internalGroups.map((betaGroup: BetaGroup) => (
          <List.Item
            title={betaGroup.attributes.name}
            icon={{ source: Icon.TwoPeople }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Manage Group"
                  icon={Icon.TwoPeople}
                  target={<BetaGroupDetail app={app} group={betaGroup} />}
                />
                {createNewGroupAction()}
                {deleteGroupAction(betaGroup)}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="External Groups">
        {externalGroups.map((betaGroup: BetaGroup) => (
          <List.Item
            title={betaGroup.attributes.name}
            icon={{ source: Icon.TwoPeople }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Manage Group"
                  icon={Icon.TwoPeople}
                  target={<BetaGroupDetail app={app} group={betaGroup} />}
                />
                <Action.Push
                  title="Manage Builds"
                  icon={Icon.Building}
                  target={<ExternalBetaGroupBuilds group={betaGroup} app={app} />}
                />
                {createNewGroupAction()}
                {deleteGroupAction(betaGroup)}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
