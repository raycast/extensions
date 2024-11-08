import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { keys } from "lodash";

import ResultDetail from "./ResultDetail";
import ResultActions from "./ResultActions";
import Actions from "./Actions";

import { Data, Field, Instance, Record } from "../types";

export default function SearchResultListItem({
  result,
  icon,
  label,
  fields,
  mutateSearchResults,
}: {
  result: Record;
  icon: Action.Props["icon"];
  label: string;
  fields: Field[];
  mutateSearchResults: () => Promise<void>;
}) {
  const [selectedInstance] = useCachedState<Instance>("instance");

  const instanceUrl = `https://${selectedInstance?.name}.service-now.com`;

  const dataKeys = keys(result.data);
  const accessories: List.Item.Accessory[] = [];
  const title = result.metadata.title?.split(/\s|\n/);
  const description = result.metadata.description?.split(/\s|\n/);
  let keywords = [label, ...(title ?? []), ...(description ?? [])];

  let name;
  if (result.table == "u_documate_page" || result.table == "u_documate_workspace") {
    result.record_url = `documate.do?w=${result.data.u_workspace?.value}&p=${result.sys_id}`;
    name = result.metadata.title || "Untitled page";
    const dataIcon = result.data.u_icon?.display;
    icon = {
      source: dataIcon || Icon.Document,
      tintColor: dataIcon ? null : Color.SecondaryText,
    };

    keywords = keywords.concat((result.data.u_workspace?.display ?? "").split(/\s|\n/));
    accessories.push({
      tag: {
        value: result.data.u_workspace?.display,
        color: Color.Green,
      },
    });
  } else {
    name = result.metadata.title;
    if (result.metadata.thumbnailURL) icon = `${instanceUrl}/${result.metadata.thumbnailURL}`;
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
      const dataKeyResult = result.data[dataKey as keyof Data];
      if (dataKey && dataKeyResult && dataKeyResult.display) {
        const value = dataKeyResult.display;
        keywords = keywords.concat(value.split(/\s|\n/));
        accessories.push({
          tag: {
            value,
            color,
          },
        });
      }
    });
  }
  if (!result.record_url.startsWith("/")) {
    result.record_url = "/" + result.record_url;
  }

  return (
    <List.Item
      key={result.sys_id}
      title={name || ""}
      subtitle={result.data.number?.display}
      icon={icon ?? undefined}
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
