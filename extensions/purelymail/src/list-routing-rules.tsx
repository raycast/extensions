import {
  ActionPanel,
  Action,
  List,
  Icon,
  launchCommand,
  LaunchType,
  Color,
  Alert,
  confirmAlert,
  showToast,
  Toast,
  popToRoot,
  Detail,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getRoutingRules, deleteRoutingRule } from "./utils/api";
import { Response, Rule } from "./utils/types";
import { getFavicon } from "@raycast/utils";

interface State {
  rules?: Rule[];
  error?: string;
  showDetails: boolean;
  isLoading?: boolean;
}

export default function ListRoutingRules() {
  const [state, setState] = useState<State>({
    rules: undefined,
    error: "",
    showDetails: false,
    isLoading: false,
  });

  useEffect(() => {
    async function getFromApi() {
      const response: Response = await getRoutingRules();

      switch (response.type) {
        case "error":
          setState((prevState) => {
            return { ...prevState, error: response.message, isLoading: false };
          });
          break;

        case "success":
          setState((prevState) => {
            return { ...prevState, error: "", rules: response.result.rules };
          });
          break;

        default:
          setState((prevState) => {
            return { ...prevState, isLoading: false };
          });
          break;
      }
    }

    getFromApi();
  }, []);

  const handleDelete = async (ruleId: number) => {
    if (
      await confirmAlert({
        title: `Delete rule with id ${ruleId}?`,
        message: "You will not be able to recover it",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setState((prevState: State) => {
        return { ...prevState, isLoading: true };
      });

      const response = await deleteRoutingRule(ruleId);
      switch (response.type) {
        case "error":
          setState((prevState) => {
            return { ...prevState, error: response.message, isLoading: false };
          });
          await showToast(Toast.Style.Failure, "Purelymail Error", response.message);
          break;

        case "success":
          setState((prevState) => {
            return { ...prevState, isLoading: false };
          });
          await showToast(Toast.Style.Success, "Rule Deleted", "RULE ID: " + ruleId);
          await popToRoot({
            clearSearchBar: true,
          });
          break;

        default:
          break;
      }
    }
  };

  const toggleShowDetails = () => {
    setState((prevState) => {
      return { ...prevState, showDetails: !state.showDetails };
    });
  };

  const ruleDescription = (rule: Rule) => {
    const { prefix, catchall, matchUser, domainName, targetAddresses } = rule;
    const targets = targetAddresses.toString().replaceAll(",", "AND");

    let from = "FROM: ";
    if (!prefix && !catchall && matchUser) {
      from += `EXACT ADDRESS '${matchUser}@${domainName}'`;
    } else if (prefix && catchall && !matchUser) {
      const msg = "ANY ADDRESS EXCEPT VALID USER ADDRESSES (CATCHALL)";
      from += `${msg}`;
    } else if (prefix && !catchall && !matchUser) {
      from += `ANY ADDRESS i.e. '*@${domainName}'`;
    } else if (prefix && !catchall && matchUser) {
      from += `ANY ADDRESS STARTING WITH '${matchUser}' i.e. '${matchUser}*@${domainName}'`;
    }
    const to = `  
    TO: '${targets}'`;

    return from + to;
  };

  return state.error ? (
    <Detail
      markdown={"⚠️" + state.error}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  ) : (
    <List
      isLoading={state.rules === undefined || state.isLoading}
      searchBarPlaceholder="Search for rule..."
      isShowingDetail={state.showDetails == true}
      navigationTitle={`${state.rules?.length || 0} rules`}
    >
      <List.Section title="Rules">
        {(state.rules || []).map((rule) => (
          <List.Item
            key={rule.id}
            icon={getFavicon(`https://${rule.domainName}`, { fallback: Icon.Forward })}
            title={`${String(rule.id)} - ${rule.domainName}`}
            subtitle={
              state.showDetails
                ? undefined
                : `${rule.matchUser || (rule.catchall && "*")} => ${rule.targetAddresses.toString()}`
            }
            accessories={
              state.showDetails
                ? undefined
                : [
                    { tag: { value: "prefix", color: rule.prefix ? Color.Green : Color.Red } },
                    { tag: { value: "catchall", color: rule.catchall ? Color.Green : Color.Red } },
                  ]
            }
            actions={
              <ActionPanel>
                <Action title="Toggle Details" icon={Icon.AppWindowSidebarRight} onAction={toggleShowDetails} />
                <Action
                  title="Create Rule"
                  icon={Icon.Plus}
                  onAction={async () => {
                    await launchCommand({
                      name: "create-routing-rule",
                      type: LaunchType.UserInitiated,
                    });
                  }}
                />
                <Action
                  title="Delete Rule"
                  icon={Icon.DeleteDocument}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => handleDelete(rule.id)}
                />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={ruleDescription(rule)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="ID" text={String(rule.id)} />
                    <List.Item.Detail.Metadata.Label
                      title="Domain Name"
                      text={rule.domainName}
                      icon={getFavicon(`https://${rule.domainName}`)}
                    />
                    <List.Item.Detail.Metadata.Label title="Prefix" icon={rule.prefix ? Icon.Check : Icon.Multiply} />
                    <List.Item.Detail.Metadata.Label
                      title="Catch All"
                      icon={rule.catchall ? Icon.Check : Icon.Multiply}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Match User"
                      text={rule.matchUser}
                      icon={!rule.matchUser ? Icon.Minus : null}
                    />
                    <List.Item.Detail.Metadata.TagList title="Target Addresses">
                      {rule.targetAddresses.map((address) => (
                        <List.Item.Detail.Metadata.TagList.Item key={address} text={address} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title={`${rule.matchUser || (rule.catchall && "*")}@${
                        rule.domainName
                      } => ${rule.targetAddresses.toString()}`}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
        <List.Item
          title="Create New Routing Rule"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action
                title="Create New Routing Rule"
                icon={Icon.Plus}
                onAction={async () => {
                  await launchCommand({ name: "create-routing-rule", type: LaunchType.UserInitiated });
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
