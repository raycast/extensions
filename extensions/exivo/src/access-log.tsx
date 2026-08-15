import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";

import { useEffect, useState } from "react";
import { AccessLogDetails } from "./components/AccessLogDetails";
import { OpenPreferencesView } from "./components/OpenPreferencesView";
import { useExivoClient } from "./hooks/useExivoClient";
import { ComponentGroupedAccessLog, groupByComponent } from "./utils/accesslogData";

export default function Command() {
  const [componentGroups, setComponentGroups] = useState<ComponentGroupedAccessLog>();
  const [componentNames, setComponentNames] = useState<string[]>();

  const { data, isLoading } = useExivoClient().getAccessLogs();

  const preferences = getPreferenceValues<ExtensionPreferences>();
  if (!preferences.clientId || !preferences.clientSecret || !preferences.siteId) {
    return <OpenPreferencesView />;
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
              subtitle={`${componentGroups[component].length} items`}
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
