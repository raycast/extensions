import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";

import { useEffect, useState } from "react";
import { AccessLogDetails } from "./components/AccessLogDetails";
import { OpenPreferences } from "./components/OpenPreferences";
import { useExivoClient } from "./hooks/useExivoClient";
import { ExivoPreferences } from "./types/ExivoPreferences";
import { ComponentGroupedAccessLog, groupByComponent } from "./utils/accesslogData";

export default function Command() {
  const [componentGroups, setComponentGroups] = useState<ComponentGroupedAccessLog>();
  const [componentNames, setComponentNames] = useState<string[]>();

  const { data, isLoading } = useExivoClient().getAccessLogs();

  const preferences = getPreferenceValues<ExivoPreferences>();
  if (!preferences.clientId || !preferences.clientSecret) {
    return OpenPreferences();
  }

  useEffect(() => {
    if (data) {
      const groupedData = groupByComponent(data);
      setComponentGroups(groupedData);
      setComponentNames(Object.getOwnPropertyNames(groupedData));
    }
  }, [data]);

  return (
    <List isLoading={isLoading}>
      <List.Section title="Doors">
        {componentGroups &&
          componentNames?.map((component) => (
            <List.Item
              key={component}
              icon={Icon.ArrowRightCircle}
              title={component}
              subtitle={`${componentGroups[component].length.toFixed(0)} items`}
              detail={
                <ActionPanel>
                  <Action.Push
                    title="Show Details"
                    target={<AccessLogDetails component={component} logItems={componentGroups[component]} />}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
