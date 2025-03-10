import { Action, ActionPanel, Detail, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import Unauthorized from "./unauthorized";
import { fetchMetrics } from "./utils/api";
import { Preferences, MetricData } from "./utils/types";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [summaryData, setSummaryData] = useState<MetricData | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const preferences = getPreferenceValues<Preferences>();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const data = await fetchMetrics(preferences.email, preferences.apiKey, yesterday.toISOString().split("T")[0]);

        if (!data.data.metric_data[0]) {
          setError("No data available");
          return;
        }

        setSummaryData(data.data.metric_data[0]);
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

  if (isLoading || !summaryData) {
    return <Detail markdown="Loading..." />;
  }

  const metrics = [
    { label: "Sleep Score", value: summaryData.sleep_score },
    { label: "Recovery Score", value: summaryData.recovery_score },
    { label: "Movement Score", value: summaryData.movement_score },
    { label: "Steps", value: summaryData.steps },
    { label: "Active Minutes", value: summaryData.active_minutes },
    { label: "Resting Heart Rate", value: summaryData.resting_heart_rate },
    { label: "HRV", value: summaryData.hrv },
  ];

  const markdown = `
# Yesterday's Health Summary

${metrics.map((metric) => `## ${metric.label}\n${metric.value || "No data available"}`).join("\n\n")}
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
