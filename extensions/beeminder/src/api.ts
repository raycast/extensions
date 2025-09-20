import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { DataPointResponse, GoalResponse, Preferences } from "./types";

export async function fetchGoals(): Promise<GoalResponse> {
  const { beeminderApiToken, beeminderUsername } = getPreferenceValues<Preferences>();
  const goalsUrl = `https://www.beeminder.com/api/v1/users/${beeminderUsername}/goals?auth_token=${beeminderApiToken}`;

  const response = await fetch(goalsUrl).then((response) => response.json());

  return response as GoalResponse;
}

export async function sendDatapoint(
  goalSlug: string,
  datapoint: string,
  comment: string,
): Promise<DataPointResponse> {
  const { beeminderApiToken, beeminderUsername } = getPreferenceValues();
  const datapointUrl = `https://www.beeminder.com/api/v1/users/${beeminderUsername}/goals/${goalSlug}/datapoints.json`;

  const response = await fetch(datapointUrl, {
    method: "POST",
    body: new URLSearchParams({
      auth_token: beeminderApiToken,
      value: datapoint.toString(),
      comment: comment,
    }),
  }).then((response) => response.json());

  return response as DataPointResponse;
}
