import { updateCommandMetadata } from "@raycast/api";
import { getDate } from "./utils/datetime";
import { ReadinessResponse, SleepResponse, ActivityResponse } from "./types";
import { convertMeters, numberWithCommas } from "./utils/measurement";
import { getAccessToken } from "./oauth";

interface AllStatus {
  readiness: ReadinessResponse;
  sleep: SleepResponse;
  activity: ActivityResponse;
}

const ouraUrl = `https://api.ouraring.com/v2/usercollection/`;

const fetchData = async (): Promise<AllStatus | undefined> => {
  try {
    const accessToken = await getAccessToken();
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    const [readinessRes, sleepRes, activityRes] = await Promise.all([
      fetch(`${ouraUrl}daily_readiness?start_date=${getDate()}&end_date=${getDate()}`, { headers }),
      fetch(`${ouraUrl}daily_sleep?start_date=${getDate()}&end_date=${getDate()}`, { headers }),
      fetch(`${ouraUrl}daily_activity?start_date=${getDate()}&end_date=${getDate(1)}`, { headers }),
    ]);

    if (!readinessRes.ok || !sleepRes.ok || !activityRes.ok) {
      throw new Error("Failed to fetch Oura summary data.");
    }

    const [readinessJson, sleepJson, activityJson] = await Promise.all([
      readinessRes.json(),
      sleepRes.json(),
      activityRes.json(),
    ]);

    return {
      readiness: { data: readinessJson } as ReadinessResponse,
      sleep: { data: sleepJson } as SleepResponse,
      activity: { data: activityJson } as ActivityResponse,
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    return undefined;
  }
};

export default async function Command() {
  const data = await fetchData();

  if (!data) {
    await updateCommandMetadata({
      subtitle: `Readiness, Sleep, and Activity from Oura`,
    });
    return;
  }

  const readinessScore = data.readiness?.data?.data[0]?.score as number,
    sleepScore = data.sleep?.data?.data[0]?.score as number,
    activityScore = data.activity?.data?.data[0]?.score as number,
    steps = data.activity?.data?.data[0]?.steps as number,
    distance = data.activity?.data?.data[0]?.equivalent_walking_distance as number;

  await updateCommandMetadata({
    subtitle: `Readiness: ${readinessScore ?? "N/A"} | Sleep: ${sleepScore ?? "N/A"} | Activity: ${activityScore ?? "N/A"} · Steps: ${numberWithCommas(steps ?? 0)} · Distance: ${convertMeters(distance ?? 0)}`,
  });
}
