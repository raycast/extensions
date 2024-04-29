import { Action, ActionPanel, Detail, Toast, showToast } from "@raycast/api";
import { useAI, useCachedPromise, withAccessToken } from "@raycast/utils";
import { getActivities, provider } from "./api/client";
import { useEffect } from "react";
import { getPreferenceValues } from "@raycast/api";

function Ask(props: { arguments: Arguments.Ask }) {
  const { data: activities, error } = useCachedPromise(async () => await getActivities(1, 100));

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not load workouts",
        message: error.message,
      });
    }
  }, [error]);

  const cleanedActivities =
    activities?.map((activity) => {
      const { map, ...rest } = activity; // eslint-disable-line @typescript-eslint/no-unused-vars
      return rest;
    }) || [];

  const preferences = getPreferenceValues();
  const { data, isLoading } = useAI(
    `Question: "${props.arguments.question}". 
    Answer based on my recent activity data: ${JSON.stringify(cleanedActivities).substring(0, 149000)}.

    Here are some rules:
    - Act as a professional sports coach (but don't mention that you are in fact a coach)
    - When talking about mileage respond in ${preferences.distance_unit === "km" ? "kilometers" : "miles"}.
    - When talking about speed respond in ${preferences.distance_unit === "km" ? "km/h" : "mph"}.
    - When talking about running speed respond with pace in ${preferences.distance_unit === "km" ? "min/km" : "min/mile"}
    `,
    {
      execute: cleanedActivities && cleanedActivities.length > 0,
      model: "anthropic-claude-haiku",
    },
  );

  return (
    <Detail
      isLoading={isLoading}
      markdown={`
## ${props.arguments.question}

${isLoading ? `Analyzing data…` : data}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Answer" content={data} />
        </ActionPanel>
      }
    />
  );
}

export default withAccessToken(provider)(Ask);
