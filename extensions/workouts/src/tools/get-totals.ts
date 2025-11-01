import { withAccessToken } from "@raycast/utils";
import { getActivities, getStats, provider } from "../api/client";
import { formatDistance, getStartOfWeekUnix } from "../utils";

export default withAccessToken(provider)(async () => {
  const recentActivities = await getActivities(1, 100, getStartOfWeekUnix());
  const stats = await getStats();

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

  return {
    weekRunTotal,
    weekRideTotal,
    weekSwimTotal,
    ytdRunTotal,
    ytdRideTotal,
    ytdSwimTotal,
    recentRunTotal,
    recentRideTotal,
    recentSwimTotal,
    allRunTotal,
    allRideTotal,
    allSwimTotal,
  };
});
