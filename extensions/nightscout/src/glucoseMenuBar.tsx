import { Cache, getPreferenceValues, Icon, launchCommand, LaunchType, MenuBarExtra, open } from "@raycast/api";
import { formatGlucoseValue, getDirectionArrow, isRecentReading } from "./utils/glucoseStats";
import { useGlucoseData } from "./hooks";
import { useServerUnits } from "./hooks";
import { createPreferencesError } from "./utils/errorHandling";
import { GlucoseEntry } from "./types";

export default function GlucoseMenubar() {
  const preferences = getPreferenceValues<Preferences>();
  const { readings, isLoading } = useGlucoseData();
  const { units } = useServerUnits();
  const cache = new Cache();

  let lastReading: GlucoseEntry | null = null;

  const preferencesError = createPreferencesError(preferences);

  if (!isLoading && readings && readings.length > 0) {
    lastReading = readings[0];
    cache.set("lastKnownGlucoseReading", JSON.stringify(lastReading));
  } else if (cache.has("lastKnownGlucoseReading")) {
    // remove any "corrupted" cache entries
    try {
      lastReading = JSON.parse(cache.get("lastKnownGlucoseReading")!);
    } catch {
      lastReading = null;
      cache.remove("lastKnownGlucoseReading");
    }
  }

  const formattedReading = lastReading
    ? `${formatGlucoseValue(lastReading.sgv, units === "mmol")} ${getDirectionArrow(lastReading.direction)}${
        isRecentReading(lastReading) ? "" : " ⚠️"
      }`
    : isLoading
      ? "Loading..."
      : "No glucose data";

  return (
    <MenuBarExtra icon={Icon.Raindrop} isLoading={isLoading} title={formattedReading} tooltip="Last Glucose Reading">
      <MenuBarExtra.Item
        icon={Icon.Clock}
        title={
          lastReading
            ? `Last updated at ${new Date(lastReading.date).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : "No glucose data"
        }
      />
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.LineChart}
          title="Glucose Trends"
          onAction={() => {
            launchCommand({
              name: "glucoseView",
              type: LaunchType.UserInitiated,
            });
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Receipt}
          title="Events"
          onAction={() => {
            launchCommand({
              name: "eventView",
              type: LaunchType.UserInitiated,
              context: { defaultFilter: "all" },
            });
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.Pill}
          title="Treatment Log"
          onAction={() => {
            launchCommand({
              name: "eventView",
              type: LaunchType.UserInitiated,
              context: { defaultFilter: "treatments" },
            });
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.Syringe}
          title="Insulin"
          onAction={() => {
            launchCommand({
              name: "eventView",
              type: LaunchType.UserInitiated,
              context: { defaultFilter: "insulin" },
            });
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.MugSteam}
          title="Carb Intake"
          onAction={() => {
            launchCommand({
              name: "eventView",
              type: LaunchType.UserInitiated,
              context: { defaultFilter: "carbs" },
            });
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.NewDocument}
          title="Add Treatment"
          onAction={() => {
            launchCommand({
              name: "treatmentEntry",
              type: LaunchType.UserInitiated,
            });
          }}
        />
      </MenuBarExtra.Section>
      {!preferencesError && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            icon={Icon.Link}
            title="Open Nightscout"
            onAction={() => {
              open(preferences.instance);
            }}
          />
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}
