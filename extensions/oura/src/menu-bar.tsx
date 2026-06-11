import { MenuBarExtra, launchCommand, LaunchType, getPreferenceValues, openCommandPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getAccessToken } from "./oauth";
import { getDate } from "./utils/datetime";
import { convertMeters, numberWithCommas } from "./utils/measurement";

interface OuraScores {
  readiness: number | null;
  sleep: number | null;
  activity: number | null;
  steps: number | null;
  distance: number | null;
}

const OURA_API_URL = "https://api.ouraring.com/v2/usercollection/";

async function fetchScores(): Promise<OuraScores> {
  const accessToken = await getAccessToken();
  const headers = { Authorization: `Bearer ${accessToken}` };

  const [readinessRes, sleepRes, activityRes] = await Promise.all([
    fetch(`${OURA_API_URL}daily_readiness?start_date=${getDate()}&end_date=${getDate()}`, { headers }),
    fetch(`${OURA_API_URL}daily_sleep?start_date=${getDate()}&end_date=${getDate()}`, { headers }),
    fetch(`${OURA_API_URL}daily_activity?start_date=${getDate()}&end_date=${getDate(1)}`, { headers }),
  ]);

  if (!readinessRes.ok || !sleepRes.ok || !activityRes.ok) {
    throw new Error("Failed to fetch Oura data");
  }

  const [readiness, sleep, activity] = await Promise.all([readinessRes.json(), sleepRes.json(), activityRes.json()]);

  return {
    readiness: readiness?.data?.[0]?.score ?? null,
    sleep: sleep?.data?.[0]?.score ?? null,
    activity: activity?.data?.[0]?.score ?? null,
    steps: activity?.data?.[0]?.steps ?? null,
    distance: activity?.data?.[0]?.equivalent_walking_distance ?? null,
  };
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences.MenuBar>();
  const { data, isLoading, revalidate, error } = useCachedPromise(fetchScores);

  const launchCommandSafely = async (name: string) => {
    try {
      await launchCommand({ name, type: LaunchType.UserInitiated });
    } catch (error) {
      console.error(`Failed to launch command: ${name}`, error);
    }
  };

  let title: string | undefined;
  if (preferences.showScoresInTitle && data) {
    const parts = [data.readiness, data.sleep, data.activity].filter((s): s is number => s != null).map(String);
    if (parts.length > 0) title = parts.join(" · ");
  }

  return (
    <MenuBarExtra
      icon={{ source: { light: "menu-bar-icon-light.svg", dark: "menu-bar-icon-dark.svg" } }}
      title={title}
      isLoading={isLoading}
      tooltip="Oura Ring Scores"
    >
      {error ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="Failed to load data" />
          <MenuBarExtra.Item title="Refresh" onAction={() => revalidate()} />
          <MenuBarExtra.Item title="Open Extension Preferences" onAction={() => openCommandPreferences()} />
        </MenuBarExtra.Section>
      ) : (
        <>
          <MenuBarExtra.Section title="Scores">
            <MenuBarExtra.Item
              title={`Readiness: ${data?.readiness ?? "N/A"}`}
              onAction={() => launchCommandSafely("readiness")}
            />
            <MenuBarExtra.Item title={`Sleep: ${data?.sleep ?? "N/A"}`} onAction={() => launchCommandSafely("sleep")} />
            <MenuBarExtra.Item
              title={`Activity: ${data?.activity ?? "N/A"}`}
              onAction={() => launchCommandSafely("activity")}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Activity Details">
            <MenuBarExtra.Item
              title={`Steps: ${data?.steps != null ? numberWithCommas(data.steps) : "N/A"}`}
              onAction={() => launchCommandSafely("activity")}
            />
            <MenuBarExtra.Item
              title={`Distance: ${data?.distance != null ? convertMeters(data.distance) : "N/A"}`}
              onAction={() => launchCommandSafely("activity")}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="Refresh" onAction={() => revalidate()} />
            <MenuBarExtra.Item title="Configure Menu Bar" onAction={() => openCommandPreferences()} />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
