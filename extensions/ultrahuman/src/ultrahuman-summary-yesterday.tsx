import { List, Icon, Color, updateCommandMetadata, getPreferenceValues } from "@raycast/api";
import { getProgressIcon, showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { Preferences, SummaryMetrics, HeartRateMetric } from "./utils/types";
import { useMetrics, getMetricState, processSummaryMetrics, getTimeAgo } from "./utils/api";
import { LoadingItem } from "./components/LoadingItem";
import Unauthorized from "./unauthorized";

export default function Command(): JSX.Element {
  const [preferences, setPreferences] = useState<Preferences>({ email: "", apiKey: "" });
  const [metrics, setMetrics] = useState<SummaryMetrics>({
    recovery: { value: 0, title: "Recovery" },
    sleep: { value: 0, title: "Sleep" },
    movement: { value: 0, title: "Movement" },
    steps: { value: 0, title: "Steps", total: 10000 },
    heartRate: { value: 0, title: "Heart Rate", unit: "BPM" },
  });

  useEffect(() => {
    try {
      const prefs = getPreferenceValues<Preferences>();
      setPreferences(prefs);
    } catch (e) {
      const error = e instanceof Error ? e : new Error("Failed to load preferences");
      showFailureToast(error);
    }
  }, []);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = yesterday.toISOString().split("T")[0];
  const { data, isLoading, isUnauthorized } = useMetrics(preferences, yesterdayISO);

  useEffect(() => {
    if (!data) return;

    try {
      const processedMetrics = processSummaryMetrics(data.data?.metric_data ?? []);
      setMetrics(processedMetrics);

      const { recovery, sleep, movement, steps, heartRate } = processedMetrics;
      updateCommandMetadata({
        subtitle: `Recovery: ${recovery.value} • Sleep: ${sleep.value} • Movement: ${movement.value} • Steps: ${steps.value} • HR: ${heartRate.value}BPM`,
      });
    } catch (error) {
      showFailureToast(error);
    }
  }, [data]);

  if (!isLoading && isUnauthorized) {
    return <Unauthorized />;
  }

  const summaryMetrics = [
    { key: "recovery", icon: Icon.Checkmark },
    { key: "sleep", icon: Icon.Moon },
    { key: "movement", icon: Icon.Person },
    { key: "heartRate", icon: Icon.Heart },
    { key: "steps", icon: Icon.Footprints },
  ] as const;

  if (isLoading || !data) {
    return (
      <List isLoading={true}>
        <List.Section title="Yesterday's Health Metrics">
          {summaryMetrics.map((metric) => (
            <LoadingItem key={metric.key} metric={metric} />
          ))}
        </List.Section>
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Search metrics">
      <List.Section title="Yesterday's Health Metrics">
        {summaryMetrics.map(({ key, icon }) => {
          const metric = metrics[key];
          const value = Math.round(metric.value);
          const displayValue =
            key === "steps"
              ? `${value.toLocaleString()} steps`
              : key === "heartRate"
                ? `${value} ${(metric as HeartRateMetric).unit}`
                : `${value}`;

          const showState = key !== "steps" && key !== "heartRate";
          const { state, color } = showState ? getMetricState(value) : { state: "", color: Color.SecondaryText };

          return (
            <List.Item
              key={key}
              icon={icon}
              title={metric.title}
              subtitle={displayValue}
              accessories={[
                ...(showState
                  ? [
                      {
                        icon: getProgressIcon(value / 100, color),
                        tooltip: `${value}% complete`,
                      },
                      {
                        tag: {
                          value: state,
                          color: color,
                        },
                      },
                    ]
                  : []),
                ...(key === "heartRate" && (metric as HeartRateMetric).lastUpdateTime
                  ? [
                      {
                        tag: {
                          value: getTimeAgo((metric as HeartRateMetric).lastUpdateTime ?? 0),
                          color: Color.SecondaryText,
                        },
                      },
                    ]
                  : []),
              ]}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
