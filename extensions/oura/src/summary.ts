import axios from "axios";
import { updateCommandMetadata, getPreferenceValues } from "@raycast/api";
import { getDate } from "./utils/datetime";
import { ReadinessResponse, SleepResponse, ActivityResponse } from "./types";
import { convertMeters, numberWithCommas } from "./utils/measurement";
import { Preference } from "./types";

const preferences = getPreferenceValues<Preference>();
const config = {
  headers: {
    Authorization: `Bearer ${preferences.oura_token}`,
  },
};

interface AllStatus {
  readiness: ReadinessResponse;
  sleep: SleepResponse;
  activity: ActivityResponse;
}

const ouraUrl = `https://api.ouraring.com/v2/usercollection/`;

const fetchData = async (): Promise<AllStatus | undefined> => {
  try {
    const readiness = (await axios.get(
      `${ouraUrl}daily_readiness?start_date=${getDate()}&end_date=${getDate()}`,
      config,
    )) as ReadinessResponse;
    const sleep = (await axios.get(
      `${ouraUrl}daily_sleep?start_date=${getDate()}&end_date=${getDate()}`,
      config,
    )) as SleepResponse;
    const activity = (await axios.get(
      `${ouraUrl}daily_activity?start_date=${getDate()}&end_date=${getDate(1)}`,
      config,
    )) as ActivityResponse;
    return { readiness, sleep, activity };
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
