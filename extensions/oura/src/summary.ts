import axios from "axios";
import { updateCommandMetadata, getPreferenceValues } from "@raycast/api";
import { today, tomorrow } from "./utils/datetime";
import { ReadinessResponse, SleepResponse, ActivityResponse } from "./types";
import { convertMeters, numberWithCommas } from "./utils/measurement";

const preferences = getPreferenceValues<Preferences>();
const config = {
  headers: {
    Authorization: `Bearer ${preferences.oura_token}`,
  },
};

const ouraUrl = `https://api.ouraring.com/v2/usercollection/`;

interface AllStatus {
  readiness: ReadinessResponse;
  sleep: SleepResponse;
  activity: ActivityResponse;
}

const fetchData = async (): Promise<AllStatus | undefined> => {
  try {
    const readiness = (await axios.get(
      `${ouraUrl}daily_readiness?start_date=${today()}&end_date=${today()}`,
      config,
    )) as ReadinessResponse;
    const sleep = (await axios.get(
      `${ouraUrl}daily_sleep?start_date=${today()}&end_date=${today()}`,
      config,
    )) as SleepResponse;
    const activity = (await axios.get(
      `${ouraUrl}daily_activity?start_date=${today()}&end_date=${tomorrow()}`,
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
  const subtitleData = {
    readiness: data?.readiness.data.data[0].score as number,
    sleep: data?.sleep.data.data[0].score as number,
    activity: data?.activity.data.data[0].score as number,
    steps: data?.activity.data.data[0].steps as number,
    distance: data?.activity.data.data[0].equivalent_walking_distance as number,
  };

  if (!data) {
    await updateCommandMetadata({
      subtitle: `Readiness, Sleep, and Activity from Oura`,
    });
    return;
  }

  await updateCommandMetadata({
    subtitle: `Readiness: ${subtitleData.readiness} | Sleep: ${subtitleData.sleep} | Activity: ${subtitleData.activity} · Steps: ${numberWithCommas(subtitleData.steps)} · Distance: ${convertMeters(subtitleData.distance)}`,
  });
}
