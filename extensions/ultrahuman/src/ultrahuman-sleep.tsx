import { List, Icon, Color, updateCommandMetadata, getPreferenceValues } from "@raycast/api";
import { getProgressIcon, showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { Preferences, SleepMetrics, SleepStage } from "./utils/types";
import { useMetrics, getMetricTitle, getStateColor } from "./utils/api";
import { LoadingItem } from "./components/LoadingItem";
import Unauthorized from "./unauthorized";

export default function Command(): JSX.Element {
  const [preferences, setPreferences] = useState<Preferences>({ email: "", apiKey: "" });
  const [sleepMetrics, setSleepMetrics] = useState<SleepMetrics>({
    efficiency: { value: 0, title: "Efficiency", state_title: "", state: "", unit: "%" },
    temperature: { value: 0, title: "Temperature", state_title: "", state: "", unit: "°C" },
    restfulness: { value: 0, title: "Restfulness", state_title: "", state: "", unit: "" },
    consistency: { value: 0, title: "Consistency", state_title: "", state: "", unit: "" },
    totalSleep: { value: 0, title: "Total Sleep", state_title: "", state: "", unit: "" },
    hrDrop: { value: 0, title: "HR Drop", state_title: "", state: "", unit: "%" },
    timing: { value: 0, title: "Timing", state_title: "", state: "", unit: "" },
    restoration: { value: 0, title: "Restoration Time", state_title: "", state: "", unit: "" },
    spo2: { value: 0, title: "SpO2", state_title: "", state: "", unit: "%" },
    timeInBed: "",
    actualSleepTime: "",
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

  const [sleepIndex, setSleepIndex] = useState<number | null>(null);
  const [sleepStages, setSleepStages] = useState<SleepStage[]>([]);

  const today = new Date().toISOString().split("T")[0];
  const { data, isLoading, isUnauthorized } = useMetrics(preferences, today);

  useEffect(() => {
    if (!data) return;

    try {
      const sleepData = data?.data?.metric_data?.find(
        (metric: { type: string }) => metric.type.toLowerCase() === "sleep"
      );

      if (!sleepData?.object) {
        return;
      }

      const timeInBed = sleepData.object.quick_metrics?.find(
        (metric: { type: string }) => metric.type === "time_in_bed"
      );
      const totalSleep = sleepData.object.quick_metrics?.find(
        (metric: { type: string }) => metric.type === "total_sleep"
      );

      if (sleepData.object.score_trend?.day_avg !== undefined) {
        const sleepScore = Math.round(sleepData.object.score_trend.day_avg);
        setSleepIndex(sleepScore);

        updateCommandMetadata({
          subtitle: `Sleep: ${sleepScore} • Total Sleep: ${totalSleep?.display_text || "N/A"}`,
        });
      }

      if (Array.isArray(sleepData.object.sleep_stages)) {
        setSleepStages(sleepData.object.sleep_stages);
      }

      const newMetrics = {
        ...sleepMetrics,
        timeInBed: timeInBed?.display_text || "N/A",
        actualSleepTime: totalSleep?.display_text || "N/A",
      };

      if (Array.isArray(sleepData.object.summary)) {
        sleepData.object.summary.forEach(
          (metric: { score?: number; title: string; state_title?: string; state?: string }) => {
            let targetMetric: keyof Omit<SleepMetrics, "timeInBed" | "actualSleepTime"> | null = null;
            const value = metric.score ?? 0;
            const title = (metric.title || "").toLowerCase();

            if (title.includes("efficiency")) targetMetric = "efficiency";
            else if (title.includes("temperature") || title.includes("temp")) targetMetric = "temperature";
            else if (title.includes("restful")) targetMetric = "restfulness";
            else if (title.includes("consistency")) targetMetric = "consistency";
            else if (title.includes("total") || title.includes("time in bed")) targetMetric = "totalSleep";
            else if (title.includes("hr drop") || title.includes("heart rate drop")) targetMetric = "hrDrop";
            else if (title.includes("timing") || title.includes("bedtime")) targetMetric = "timing";
            else if (title.includes("restoration") || title.includes("recovery")) targetMetric = "restoration";
            else if (title.includes("spo2")) targetMetric = "spo2";

            if (targetMetric) {
              newMetrics[targetMetric] = {
                value: Math.round(value),
                title: metric.title || getMetricTitle(targetMetric),
                state_title: metric.state_title || "",
                state: metric.state || "good",
                unit: "",
              };
            }
          }
        );
      }

      if (sleepData.object.spo2?.value !== undefined) {
        newMetrics.spo2 = {
          value: Math.round(sleepData.object.spo2.value),
          title: "SpO2",
          state_title: "Normal",
          state: sleepData.object.spo2.state || "optimal",
          unit: "%",
        };
      }

      setSleepMetrics(newMetrics);
    } catch (error) {
      showFailureToast(error);
    }
  }, [data]);

  if (!isLoading && isUnauthorized) {
    return <Unauthorized />;
  }

  const sleepMetricsList = [
    { key: "efficiency", icon: Icon.Gauge },
    { key: "temperature", icon: Icon.Temperature },
    { key: "restfulness", icon: Icon.Star },
    { key: "consistency", icon: Icon.Calendar },
    { key: "totalSleep", icon: Icon.Clock },
    { key: "hrDrop", icon: Icon.Heart },
    { key: "timing", icon: Icon.Clock },
    { key: "restoration", icon: Icon.Bolt },
    { key: "spo2", icon: Icon.Circle },
  ];

  if (isLoading || !data) {
    return (
      <List isLoading={true}>
        <List.Section title="Sleep Score">
          <LoadingItem metric={{ key: "sleepScore", icon: Icon.Moon }} />
        </List.Section>
        <List.Section title="Sleep Metrics">
          {sleepMetricsList.map((metric) => (
            <LoadingItem key={metric.key} metric={metric} />
          ))}
        </List.Section>
        <List.Section title="Sleep Stages">
          <LoadingItem metric={{ key: "sleepStages", icon: Icon.Circle }} />
        </List.Section>
        <List.Section title="Sleep Duration">
          <LoadingItem metric={{ key: "timeInBed", icon: Icon.Moon }} />
          <LoadingItem metric={{ key: "actualSleep", icon: Icon.Clock }} />
        </List.Section>
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Search sleep metrics">
      <List.Section title="Sleep Score">
        <List.Item
          icon={Icon.Moon}
          title="Sleep Score"
          subtitle={sleepIndex?.toString() || "N/A"}
          accessories={[
            {
              icon: getProgressIcon(
                sleepIndex ? sleepIndex / 100 : 0,
                sleepIndex && sleepIndex >= 80 ? Color.Green : sleepIndex && sleepIndex >= 60 ? Color.Yellow : Color.Red
              ),
              tooltip: `${sleepIndex || 0}% complete`,
            },
            {
              tag: {
                value:
                  sleepIndex && sleepIndex >= 80
                    ? "Optimal"
                    : sleepIndex && sleepIndex >= 60
                      ? "Good"
                      : "Needs Attention",
                color:
                  sleepIndex && sleepIndex >= 80
                    ? Color.Green
                    : sleepIndex && sleepIndex >= 60
                      ? Color.Yellow
                      : Color.Red,
              },
            },
          ]}
        />
      </List.Section>

      <List.Section title="Sleep Metrics">
        {sleepMetricsList.map(({ key, icon }) => {
          const metric = sleepMetrics[key as keyof SleepMetrics];
          if (!metric || typeof metric === "string") return null;

          const value = Math.round(metric.value);
          const displayValue = key === "spo2" ? `${value}${metric.unit}` : `${value}`;

          return (
            <List.Item
              key={key}
              icon={icon}
              title={getMetricTitle(key)}
              subtitle={displayValue}
              accessories={[
                {
                  icon: getProgressIcon(value / 100, getStateColor(metric.state)),
                  tooltip: `${value}${metric.unit || ""}`,
                },
                {
                  tag: {
                    value: metric.state_title || metric.state,
                    color: getStateColor(metric.state),
                  },
                },
              ]}
            />
          );
        })}
      </List.Section>

      <List.Section title="Sleep Stages">
        {sleepStages.map((stage) => (
          <List.Item
            key={stage.title}
            icon={Icon.Circle}
            title={stage.title}
            subtitle={stage.stage_time_text}
            accessories={[
              {
                tag: {
                  value: `${Math.round(stage.percentage)}%`,
                  color: Color.SecondaryText,
                },
              },
            ]}
          />
        ))}
      </List.Section>

      <List.Section title="Sleep Duration">
        <List.Item icon={Icon.Moon} title="Time in Bed" subtitle={sleepMetrics.timeInBed} />
        <List.Item icon={Icon.Clock} title="Actual Sleep Time" subtitle={sleepMetrics.actualSleepTime} />
      </List.Section>
    </List>
  );
}
