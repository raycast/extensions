import { List, Icon, confirmAlert, Alert, ActionPanel, Action, Color, Keyboard } from "@raycast/api";
import { BetaGroup, betaTestersSchema, BetaTester, App, betaTesterUsageSchemas } from "../Model/schemas";
import { useAppStoreConnectApi, fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { useEffect, useState } from "react";
import ExternalBetaGroupTesters from "./ExternalBetaGroupTesters";
import AddExternalBetaTester from "./AddExternalBetaTester";
import ManageInternalBuilds from "./ManageInternalBuilds";
interface Props {
  app: App;
  group: BetaGroup;
}
export default function BetaGroupDetail({ app, group }: Props) {
  const {
    data,
    isLoading: isLoadingBetaGroup,
    pagination,
  } = useAppStoreConnectApi(`/betaTesters?filter[betaGroups]=${group.id}`, (response) => {
    return betaTestersSchema.safeParse(response.data).data ?? null;
  });
  const [testers, setTesters] = useState<BetaTester[]>([]);
  const { data: betaTesterUsages, isLoading: isLoadingBetaTesterUsages } = useAppStoreConnectApi(
    `/betaGroups/${group.id}/metrics/betaTesterUsages?groupBy=betaTesters`,
    (response) => {
      return betaTesterUsageSchemas.safeParse(response.data).data ?? null;
    },
    true,
  );

  useEffect(() => {
    if (data && betaTesterUsages) {
      setTesters(data);
    }
  }, [data, betaTesterUsages]);

  const getBetaTesterUsage = (betaTester: BetaTester) => {
    const usage = betaTesterUsages?.find((usage) => usage.dimensions.betaTesters.data.id === betaTester.id);
    if (usage) {
      return usage.dataPoints[0];
    } else {
      return undefined;
    }
  };

  const textForState = (betaTester: BetaTester): string => {
    switch (betaTester.attributes.state) {
      case "INVITED":
        return "Invited";
      case "ACCEPTED":
        return "Accepted";
      case "INSTALLED":
        return "Installed";
      case "DECLINED":
        return "Declined";
      case "NOT_INVITED":
        return "No Builds Available";
      default: {
        const state = betaTester.attributes.state ?? "";
        const capitalized = state.toLowerCase().charAt(0).toUpperCase() + state.slice(1);
        return capitalized;
      }
    }
  };

  const iconForState = (betaTester: BetaTester) => {
    switch (betaTester.attributes.state) {
      case "INVITED":
        return { source: Icon.Dot, tintColor: Color.Yellow };
      case "ACCEPTED":
        return { source: Icon.Dot, tintColor: Color.Green };
      case "INSTALLED":
        return { source: Icon.Dot, tintColor: Color.Green };
      case "DECLINED":
        return { source: Icon.Dot, tintColor: Color.Red };
      case "NOT_INVITED":
        return { source: Icon.Dot, tintColor: Color.Red };
      default:
        return Icon.Dot;
    }
  };
  const listAccessory = (betaTester: BetaTester): React.ComponentProps<typeof List.Item>["accessories"] => {
    const usage = getBetaTesterUsage(betaTester);
    const accessories = [];
    if (usage) {
      accessories.push({
        text: usage.values.sessionCount.toString(),
        icon: { source: Icon.Mobile, tintColor: Color.Green },
        tooltip: "Sessions",
      });
      accessories.push({
        text: usage.values.crashCount.toString(),
        icon: { source: Icon.Exclamationmark, tintColor: Color.Red },
        tooltip: "Crashes",
      });
      accessories.push({
        text: usage.values.feedbackCount.toString(),
        icon: { source: Icon.Envelope, tintColor: Color.Yellow },
        tooltip: "Feedback",
      });
    }
    if (betaTester.attributes.state) {
      accessories.push({ text: textForState(betaTester), icon: iconForState(betaTester) });
    }
    return accessories;
  };

  const addNewTesterAction = () => {
    return (
      <Action.Push
        title="Add New Tester"
        shortcut={Keyboard.Shortcut.Common.New}
        icon={Icon.AddPerson}
        target={
          <AddExternalBetaTester
            group={group}
            didUpdateNewTester={(newTester) => {
              setTesters(testers.concat(newTester));
            }}
          />
        }
      />
    );
  };
  const addMultipleTestersAction = () => {
    return (
      <Action.Push
        title="Add Multiple Testers"
        shortcut={{ modifiers: ["cmd"], key: "m" }}
        icon={Icon.AddPerson}
        target={
          <ExternalBetaGroupTesters
            group={group}
            app={app}
            didUpdateNewTesters={(newTesters) => {
              setTesters(testers.concat(newTesters));
            }}
          />
        }
      />
    );
  };
  const manageBuildsAction = () => {
    return (
      <Action.Push
        title="Manage Builds"
        shortcut={{ modifiers: ["cmd"], key: "b" }}
        icon={Icon.Building}
        target={<ManageInternalBuilds app={app} group={group} didAddBuilds={() => {}} didRemoveBuilds={() => {}} />}
      />
    );
  };
  const removeTesterAction = (tester: BetaTester) => {
    return (
      <Action
        title="Remove from Group"
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.Remove}
        icon={Icon.Trash}
        onAction={() => {
          (async () => {
            if (
              await confirmAlert({
                title: "Are you sure?",
                primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
              })
            ) {
              setTesters(testers.filter((t) => t.id !== tester.id));
              await fetchAppStoreConnect(`/betaTesters/${tester.id}/relationships/betaGroups`, "DELETE", {
                data: [
                  {
                    type: "betaGroups",
                    id: group.id,
                  },
                ],
              });
            }
          })();
        }}
      />
    );
  };

  const copyAction = (user: BetaTester) => {
    return (
      <>
        <Action.CopyToClipboard
          title="Copy Name"
          shortcut={Keyboard.Shortcut.Common.Copy}
          content={user.attributes.firstName + " " + user.attributes.lastName}
        />
        <Action.CopyToClipboard
          title="Copy Email"
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          content={user.attributes.email ?? ""}
        />
      </>
    );
  };

  return (
    <List
      isLoading={isLoadingBetaGroup || isLoadingBetaTesterUsages}
      pagination={pagination}
      actions={
        <ActionPanel>
          {group.attributes.isInternalGroup ? (
            <>
              {addNewTesterAction()}
              {manageBuildsAction()}
            </>
          ) : (
            <>
              {addNewTesterAction()}
              {addMultipleTestersAction()}
            </>
          )}
        </ActionPanel>
      }
    >
      {testers?.map((tester: BetaTester) => (
        <List.Item
          title={
            (tester.attributes.inviteType === "PUBLIC_LINK"
              ? tester.attributes.firstName
              : tester.attributes.firstName + " " + tester.attributes.lastName) ?? ""
          }
          subtitle={
            tester.attributes.inviteType === "PUBLIC_LINK" ? "Public link" ?? "" : tester.attributes.email ?? ""
          }
          key={tester.id}
          icon={{ source: Icon.Person }}
          accessories={listAccessory(tester)}
          actions={
            <ActionPanel>
              {copyAction(tester)}
              {removeTesterAction(tester)}
              {addNewTesterAction()}
              {addMultipleTestersAction()}
              {manageBuildsAction()}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
