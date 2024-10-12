import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { keys } from "lodash";

import ResultDetail from "./ResultDetail";
import ResultActions from "./ResultActions";
import Actions from "./Actions";

import { Instance } from "../hooks/useInstances";

export default function SearchResultListItem({
  result,
  icon,
  label,
  fields,
  mutateSearchResults,
}: {
  result: any;
  icon: string;
  label: string;
  fields: any;
  mutateSearchResults: () => Promise<void>;
}) {
  const [selectedInstance] = useCachedState<Instance>("instance");

  const instanceUrl = `https://${selectedInstance?.name}.service-now.com`;

  if (result.metadata.thumbnailURL)
    icon = `${instanceUrl}/${result.metadata.thumbnailURL}`;

  const dataKeys = keys(result.data);
  const accessories: List.Item.Accessory[] = [];
  let keywords = [label, ...result.metadata.description?.split(/\s|\n/)];

  if (result.data.number) keywords.push(result.data.number.display);
  if (result.data.priority) {
    const priority = result.data.priority.value;
    if (priority == 1) {
      keywords.push("Critical");
      accessories.push({
        icon: {
          source: Icon.Bell,
          tintColor: Color.Red,
        },
        tooltip: "Critical Priority",
      });
    }

    if (priority == 2) {
      keywords.push("High");
      accessories.push({
        icon: {
          source: Icon.Bell,
          tintColor: Color.Orange,
        },
        tooltip: "High Priority",
      });
    }
  }
  const keysToCheck = [
    { key: "category", color: Color.Green },
    { key: "state", color: Color.Blue },
  ];

  keysToCheck.forEach(({ key, color }) => {
    const dataKey = dataKeys.find((dataKey) => dataKey.includes(key));
    if (dataKey && result.data[dataKey].display) {
      const value = result.data[dataKey].display;
      keywords = keywords.concat(value.split(/\s|\n/));
      accessories.push({
        tag: {
          value,
          color,
        },
      });
    }
  });

  if (!result.record_url.startsWith("/")) {
    result.record_url = "/" + result.record_url;
  }

  return (
    <List.Item
      key={result.sys_id}
      title={result.metadata.title || ""}
      subtitle={result.data.number?.display}
      icon={icon}
      keywords={keywords}
      actions={
        <ActionPanel>
          <ResultActions result={result}>
            <Action.Push
              title="Show Details"
              icon={Icon.Sidebar}
              target={<ResultDetail result={result} fields={fields} />}
            />
          </ResultActions>
          <Actions mutate={mutateSearchResults} />
        </ActionPanel>
      }
      accessories={accessories}
    />
  );
}
