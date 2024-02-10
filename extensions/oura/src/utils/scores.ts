import { oura } from "./ouraData";
import { today } from "./datetime";
import { ReadinessResponse, ActivityResponse, SleepResponse } from "../types";

export function scoresData() {
  const readiness = oura(
    `usercollection/daily_readiness?start_date=${today()}&end_date=${today()}`,
  ) as ReadinessResponse;
  const activity = oura(`usercollection/daily_activity?start_date=${today()}&end_date=${today()}`) as ActivityResponse;
  const sleep = oura(`usercollection/daily_sleep?start_date=${today()}&end_date=${today()}`) as SleepResponse;

  return { readiness, activity, sleep };
}

export async function justScores() {
  const scores = scoresData();
  const readiness = scores.readiness?.data?.data[0].score;
  const activity = scores?.activity?.data?.data[0].score;
  const sleep = scores?.sleep?.data?.data[0].score;

  return {
    readiness: readiness,
    activity: activity,
    sleep: sleep,
  };
}
