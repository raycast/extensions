import { List, ActionPanel, Action } from "@raycast/api";
import { getDnd } from "./utils/dndData";
import { index, indexCollection } from "./utils/types";
import RuleDetail from "./templates/ruleDetail";
import Unresponsive from "./templates/unresponsive";

interface rulesTypes {
  isLoading: boolean;
  data: indexCollection;
}

export default function Command() {
  const rules = getDnd("/api/rule-sections") as rulesTypes;

  if (!rules?.data && rules.isLoading) {
    return <List isLoading={true} />;
  }

  if (!rules?.data) {
    return <Unresponsive />;
  }

  return (
    <List
      searchBarPlaceholder={`Searching ${rules.data.results.length} rules...`}
      throttle={true}
      filtering={true}
      isLoading={rules.isLoading}
    >
      {rules?.data.results?.map((rule: index) => (
        <List.Item
          key={rule.index}
          title={rule.name}
          actions={
            <ActionPanel>
              <Action.Push title={`Show Rule Details`} target={<RuleDetail index={rule.index} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
