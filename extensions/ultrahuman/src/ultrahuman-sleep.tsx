import { Action, ActionPanel, Detail, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import Unauthorized from "./unauthorized";
import { fetchMetrics } from "./utils/api";
import { Preferences, MetricData } from "./utils/types";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [sleepData, setSleepData] = useState<MetricData | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const preferences = getPreferenceValues<Preferences>();
        const data = await fetchMetrics(preferences.email, preferences.apiKey);

        if (!data.data.metric_data[0]) {
          setError("No data available");
          return;
        }

        setSleepData(data.data.metric_data[0]);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("401")) {
            setIsUnauthorized(true);
          } else {
            setError(error.message);
          }
        } else {
          setError("An unknown error occurred");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (isUnauthorized) {
    return <Unauthorized />;
  }

  if (error) {
    return <Detail markdown={`# Error\n\n${error}`} />;
  }

  if (isLoading || !sleepData) {
    return <Detail markdown="Loading..." />;
  }

  const sleepMetrics = [
    { label: "Sleep Duration", value: sleepData.sleep_duration },
    { label: "Deep Sleep", value: sleepData.deep_sleep },
    { label: "REM Sleep", value: sleepData.rem_sleep },
    { label: "Light Sleep", value: sleepData.light_sleep },
    { label: "Sleep Score", value: sleepData.sleep_score },
    { label: "Sleep Efficiency", value: sleepData.sleep_efficiency },
  ];

  const markdown = `
# Sleep Metrics

${sleepMetrics.map((metric) => `## ${metric.label}\n${metric.value || "No data available"}`).join("\n\n")}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Ultrahuman" url="https://ultrahuman.com" />
        </ActionPanel>
      }
    />
  );
}
