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
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getRoutingRules, deleteRoutingRule } from "./utils/api";
import { Response, Rule } from "./utils/types";
import { getFavicon, useCachedState } from "@raycast/utils";
import ErrorComponent from "./components/ErrorComponent";

export default function ListRoutingRules() {
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [rules, setRules] = useCachedState<Rule[]>("rules");
  const [isShowingDetails, setIsShowingDetails] = useState(false);

  async function getFromApi() {
    setIsLoading(true);
    const response: Response = await getRoutingRules();

    if (response.type === "error") {
      setError(response.message);
    } else {
      setRules(response.result.rules);
      await showToast({
        title: "SUCCESS",
        message: `Fetched ${response.result.rules?.length} rules`,
      });
    }
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  const handleDelete = async (ruleId: number) => {
    if (
      await confirmAlert({
        title: `Delete rule with id ${ruleId}?`,
        message: "You will not be able to recover it",
        icon: Icon.DeleteDocument,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);

      const response = await deleteRoutingRule(ruleId);
      if (response.type === "success") {
        await showToast(Toast.Style.Success, "Rule Deleted", "RULE ID: " + ruleId);
        await getFromApi();
      }
      setIsLoading(false);
    }
  };

  const toggleShowDetails = () => {
    setIsShowingDetails((prevState) => !prevState);
  };

  const filteredRules = !rules ? [] : filter === "" ? rules : rules.filter((rule) => rule.domainName === filter);
  const rulesTitle = `${filteredRules.length} of ${rules?.length || 0} rules`;

  const ruleDescription = (rule: Rule) => {
    const { prefix, catchall, matchUser, domainName, targetAddresses } = rule;
    const targets = targetAddresses.join(" AND ");

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

  const ruleSubtitle = (rule: Rule) => {
    const { prefix, catchall, matchUser, targetAddresses } = rule;
    let from = "";
    if (prefix && !catchall && !matchUser) from = "*";
    else if (prefix && catchall && !matchUser) from = "<any>";
    else if (prefix && !catchall && matchUser) from = `${matchUser}*`;
    else from = matchUser;

    return from + ` => ${targetAddresses.toString()}`;
  };

  return error ? (
    <ErrorComponent error={error} />
  ) : (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for rule..."
      isShowingDetail={isShowingDetails}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Domain" onChange={(newValue) => setFilter(newValue)}>
          <List.Dropdown.Item title="All Domains" value="" icon={Icon.Dot} />
          {Array.from(new Set(rules?.map((rule) => rule.domainName).flat())).map((domainName) => (
            <List.Dropdown.Item
              key={domainName}
              title={domainName}
              value={domainName}
              icon={getFavicon(`https://${domainName}`, { fallback: Icon.List })}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title={rulesTitle}>
        {filteredRules.map((rule) => (
          <List.Item
            key={rule.id}
            icon={getFavicon(`https://${rule.domainName}`, { fallback: Icon.Forward })}
            title={`${String(rule.id)} - ${rule.domainName}`}
            subtitle={isShowingDetails ? undefined : ruleSubtitle(rule)}
            accessories={
              isShowingDetails
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
                  style={Action.Style.Destructive}
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
      </List.Section>
      <List.Section title="Commands">
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
