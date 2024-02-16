import { Action, ActionPanel, Detail, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchAirQuality } from "./shared/api";
import dayjs from "./shared/dayjs";
import { getForecastRecords, getPollutionLevelAndImplication } from "./shared/utils";

export default function Command() {
  const { data, error, isLoading } = useCachedPromise(fetchAirQuality);

  if (error || !data) {
    return (
      <Detail
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  const pollution = getPollutionLevelAndImplication(data.aqi);
  const updatedTime = dayjs(data.time.iso).fromNow();

  const defaultAction = (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open in Browser" url={data.city.url} />
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading}>
      <List.Item
        icon={Icon.StarCircle}
        title="AQI"
        subtitle={data.aqi.toString()}
        accessories={[
          {
            icon: `levels/${pollution.level}.png`,
            text: pollution.levelName,
            tooltip: pollution.implication,
          },
        ]}
        actions={defaultAction}
      />
      <List.Item icon={Icon.Building} title="Station" subtitle={data.city.name} actions={defaultAction} />
      <List.Item icon={Icon.Clock} title="Last Updated" subtitle={updatedTime} actions={defaultAction} />
      <List.Section title="Forecast">
        {getForecastRecords(data).map((record) => {
          return (
            <List.Item
              key={record.day}
              icon={Icon.Sun}
              title={record.day}
              subtitle={`AQI: ${record.avg}`}
              accessories={[
                {
                  icon: `levels/${pollution.level}.png`,
                  text: pollution.levelName,
                  tooltip: pollution.implication,
                },
              ]}
            />
          );
        })}
      </List.Section>
      <List.Section title="Attribution">
        {data.attributions.map((attribution) => (
          <List.Item
            key={attribution.name}
            icon={Icon.Info}
            title={attribution.name}
            subtitle={attribution.url}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Browser" url={attribution.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
