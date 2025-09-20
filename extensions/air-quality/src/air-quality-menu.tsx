import { Color, Icon, LaunchType, MenuBarExtra, launchCommand, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchAirQuality } from "./shared/api";
import dayjs from "./shared/dayjs";
import { getForecastRecords, getPollutionLevelAndImplication } from "./shared/utils";

export default function Command() {
  const { data, error, isLoading } = useCachedPromise(fetchAirQuality);

  if (error || !data) {
    return (
      <MenuBarExtra icon={{ source: Icon.Warning, tintColor: Color.Red }}>
        <MenuBarExtra.Item title={error?.message || "Error"} />
        <MenuBarExtra.Item
          title="Open Extension Preferences"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra>
    );
  }

  const pollution = getPollutionLevelAndImplication(data.aqi);
  const updatedTime = dayjs(data.time.iso).fromNow();

  const defaultAction = () => {
    launchCommand({
      name: "show-air-quality",
      type: LaunchType.UserInitiated,
    });
  };

  return (
    <MenuBarExtra
      icon={`levels/${pollution.level}.png`}
      title={data.aqi.toString()}
      tooltip="Your Pull Requests"
      isLoading={isLoading}
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item icon={Icon.Circle} title={pollution.levelName} onAction={defaultAction} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item icon={Icon.Building} title="City/Station" />
        <MenuBarExtra.Item title={data.city.name} onAction={defaultAction} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item icon={Icon.Eye} title="Forecast" />
        {getForecastRecords(data).map((record) => {
          return (
            <MenuBarExtra.Item
              key={record.day}
              icon={`levels/${pollution.level}.png`}
              title={record.day}
              subtitle={`⏺ ${record.avg}`}
              onAction={defaultAction}
            />
          );
        })}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item icon={Icon.Clock} title="Last Updated" subtitle={updatedTime} onAction={defaultAction} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Cog}
          title="Preferences"
          onAction={openExtensionPreferences}
          shortcut={{ key: ",", modifiers: ["cmd"] }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
