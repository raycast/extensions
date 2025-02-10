import { Color, Icon, MenuBarExtra, getPreferenceValues, open, openCommandPreferences } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { getActivities, getAthleteId, getStats, provider } from "./api/client";
import { sportIcons } from "./constants";
import { formatDistance, getStartOfWeekUnix } from "./utils";

function MenuBarTotals() {
  const { data: stats, isLoading } = useCachedPromise(getStats, []);
  const { data: athleteId } = useCachedPromise(getAthleteId, []);
  const { data: recentActivities } = useCachedPromise(() => getActivities(1, 100, getStartOfWeekUnix()), []);

  if (!stats || !recentActivities) {
    return <MenuBarExtra isLoading={isLoading} />;
  }

  const preferences: Preferences.MenubarTotals = getPreferenceValues();

  const stravaProfileUrl = athleteId ? `https://www.strava.com/athletes/${athleteId}` : "https://www.strava.com";

  const weekRunTotal = formatDistance(
    recentActivities?.reduce((acc, activity) => (activity.type === "Run" ? acc + activity.distance : acc), 0) || 0,
  );
  const weekRideTotal = formatDistance(
    recentActivities?.reduce((acc, activity) => (activity.type === "Ride" ? acc + activity.distance : acc), 0) || 0,
  );
  const weekSwimTotal = formatDistance(
    recentActivities?.reduce((acc, activity) => (activity.type === "Swim" ? acc + activity.distance : acc), 0) || 0,
  );
  const ytdRunTotal = formatDistance(stats.ytd_run_totals.distance);
  const ytdRideTotal = formatDistance(stats.ytd_ride_totals.distance);
  const ytdSwimTotal = formatDistance(stats.ytd_swim_totals.distance);
  const recentRunTotal = formatDistance(stats.recent_run_totals.distance);
  const recentRideTotal = formatDistance(stats.recent_ride_totals.distance);
  const recentSwimTotal = formatDistance(stats.recent_swim_totals.distance);
  const allRunTotal = formatDistance(stats.all_run_totals.distance);
  const allRideTotal = formatDistance(stats.all_ride_totals.distance);
  const allSwimTotal = formatDistance(stats.all_swim_totals.distance);

  const primarySport = preferences.primary_sport;
  const primaryStat = preferences.primary_stat;
  const iconSrc = sportIcons[primarySport];

  let primarySportTotal =
    primaryStat === "year"
      ? ytdRunTotal
      : primaryStat === "all"
        ? allRunTotal
        : primaryStat === "week"
          ? weekRunTotal
          : recentRunTotal;
  if (primarySport === "Ride") {
    primarySportTotal =
      primaryStat === "year"
        ? ytdRideTotal
        : primaryStat === "all"
          ? allRideTotal
          : primaryStat === "week"
            ? weekRideTotal
            : recentRideTotal;
  } else if (primarySport === "Swim") {
    primarySportTotal =
      primaryStat === "year"
        ? ytdSwimTotal
        : primaryStat === "all"
          ? allSwimTotal
          : primaryStat === "week"
            ? weekSwimTotal
            : recentSwimTotal;
  }

  return (
    <MenuBarExtra
      icon={{
        source: iconSrc,
        tintColor: Color.PrimaryText,
      }}
      title={primarySportTotal}
      tooltip={`${primarySport} ${primaryStat}`}
    >
      <MenuBarExtra.Section title="This week">
        {+weekRunTotal > 0 || primarySport === "Run" ? (
          <MenuBarExtra.Item
            title={weekRunTotal}
            icon={{ source: "run.svg", tintColor: Color.PrimaryText }}
            onAction={() => open(stravaProfileUrl)}
          />
        ) : null}
        {+weekRideTotal > 0 || primarySport === "Ride" ? (
          <MenuBarExtra.Item
            title={weekRideTotal}
            icon={{ source: "ride.svg", tintColor: Color.PrimaryText }}
            onAction={() => open(stravaProfileUrl)}
          />
        ) : null}
        {+weekSwimTotal > 0 || primarySport === "Swim" ? (
          <MenuBarExtra.Item
            title={weekSwimTotal}
            icon={{ source: "swim.svg", tintColor: Color.PrimaryText }}
            onAction={() => open(stravaProfileUrl)}
          />
        ) : null}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Last 4 weeks">
        {stats.recent_run_totals.distance || primarySport === "Run" ? (
          <MenuBarExtra.Item
            title={recentRunTotal}
            icon={{ source: "run.svg", tintColor: Color.PrimaryText }}
            onAction={() => open(stravaProfileUrl)}
          />
        ) : null}
        {stats.recent_ride_totals.distance || primarySport === "Ride" ? (
          <MenuBarExtra.Item
            title={recentRideTotal}
            icon={{ source: "ride.svg", tintColor: Color.PrimaryText }}
            onAction={() => open(stravaProfileUrl)}
          />
        ) : null}
        {stats.recent_swim_totals.distance || primarySport === "Swim" ? (
          <MenuBarExtra.Item
            title={recentSwimTotal}
            icon={{ source: "swim.svg", tintColor: Color.PrimaryText }}
            onAction={() => open(stravaProfileUrl)}
          />
        ) : null}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="This Year">
        {stats.ytd_run_totals.distance || primarySport === "Run" ? (
          <MenuBarExtra.Item
            title={ytdRunTotal}
            icon={{ source: "run.svg", tintColor: Color.PrimaryText }}
            onAction={() => open(stravaProfileUrl)}
          />
        ) : null}
        {stats.ytd_ride_totals.distance || primarySport === "Ride" ? (
          <MenuBarExtra.Item
            title={ytdRideTotal}
            icon={{ source: "ride.svg", tintColor: Color.PrimaryText }}
            onAction={() => open(stravaProfileUrl)}
          />
        ) : null}
        {stats.ytd_swim_totals.distance || primarySport === "Swim" ? (
          <MenuBarExtra.Item
            title={ytdSwimTotal}
            icon={{ source: "swim.svg", tintColor: Color.PrimaryText }}
            onAction={() => open(stravaProfileUrl)}
          />
        ) : null}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="All Time">
        {stats.all_run_totals.distance || primarySport === "Run" ? (
          <MenuBarExtra.Item
            title={allRunTotal}
            icon={{ source: "run.svg", tintColor: Color.PrimaryText }}
            onAction={() => open(stravaProfileUrl)}
          />
        ) : null}
        {stats.all_ride_totals.distance || primarySport === "Ride" ? (
          <MenuBarExtra.Item
            title={allRideTotal}
            icon={{ source: "ride.svg", tintColor: Color.PrimaryText }}
            onAction={() => open(stravaProfileUrl)}
          />
        ) : null}
        {stats.all_swim_totals.distance || primarySport === "Swim" ? (
          <MenuBarExtra.Item
            title={allSwimTotal}
            icon={{ source: "swim.svg", tintColor: Color.PrimaryText }}
            onAction={() => open(stravaProfileUrl)}
          />
        ) : null}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure Command"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

export default withAccessToken(provider)(MenuBarTotals);
