import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getProfile, getWeightStats, logWeight } from "./api";
import { kgToLb, lbToKg } from "./utils";

export default function LogWeight() {
  const [weightError, setWeightError] = useState<string | undefined>();
  const [bodyFatError, setBodyFatError] = useState<string | undefined>();

  const { data, isLoading } = useCachedPromise(async () => {
    const [profile, stats] = await Promise.all([getProfile(), getWeightStats()]);
    return { profile, stats };
  });

  const isImperial = data?.profile.unitSystem === "imperial";
  const unit = isImperial ? "lb" : "kg";
  const stats = data?.stats;

  const currentDisplay =
    stats?.current != null ? `${isImperial ? kgToLb(stats.current) : stats.current} ${unit}` : null;

  const statusParts = [
    ...(currentDisplay ? [`Current: ${currentDisplay}`] : []),
    ...(stats?.change7d != null
      ? [`7-day change: ${formatDelta(isImperial ? kgToLb(stats.change7d) : stats.change7d, unit)}`]
      : []),
    ...(stats?.goal != null ? [`Goal: ${isImperial ? kgToLb(stats.goal) : stats.goal} ${unit}`] : []),
  ];

  async function handleSubmit(values: { weight: string; bodyFat: string; note: string }) {
    const weightInput = parseFloat(values.weight.replace(",", "."));
    if (Number.isNaN(weightInput)) {
      setWeightError("Enter your weight as a number");
      return;
    }
    const weightKg = isImperial ? lbToKg(weightInput) : Math.round(weightInput * 10) / 10;
    if (weightKg < 20 || weightKg > 500) {
      setWeightError(`Weight must be between ${isImperial ? "44 and 1100 lb" : "20 and 500 kg"}`);
      return;
    }

    let bodyFatPct: number | undefined;
    if (values.bodyFat.trim() !== "") {
      bodyFatPct = parseFloat(values.bodyFat.replace(",", "."));
      if (Number.isNaN(bodyFatPct) || bodyFatPct < 3 || bodyFatPct > 70) {
        setBodyFatError("Body fat must be between 3 and 70%");
        return;
      }
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Logging weight..." });
    try {
      await logWeight({ weightKg, bodyFatPct, note: values.note.trim() || undefined });
      toast.style = Toast.Style.Success;
      toast.title = `Logged ${isImperial ? `${kgToLb(weightKg)} lb` : `${weightKg} kg`}`;
      if (stats?.current != null) {
        const deltaKg = Math.round((weightKg - stats.current) * 10) / 10;
        if (deltaKg !== 0) {
          toast.message = `${formatDelta(isImperial ? kgToLb(deltaKg) : deltaKg, unit)} since last entry`;
        }
      }
      await popToRoot();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Log Weight";
      toast.message = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log Weight" icon={Icon.LineChart} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {statusParts.length > 0 && <Form.Description title="Trend" text={statusParts.join("  ·  ")} />}
      {stats?.weeklyInsight && <Form.Description text={stats.weeklyInsight} />}
      <Form.TextField
        id="weight"
        title={`Weight (${unit})`}
        placeholder={stats?.current != null ? String(isImperial ? kgToLb(stats.current) : stats.current) : "e.g. 72.5"}
        error={weightError}
        onChange={() => {
          if (weightError) setWeightError(undefined);
        }}
        autoFocus
      />
      <Form.TextField
        id="bodyFat"
        title="Body Fat % (optional)"
        placeholder="e.g. 18.5"
        error={bodyFatError}
        onChange={() => {
          if (bodyFatError) setBodyFatError(undefined);
        }}
      />
      <Form.TextField id="note" title="Note (optional)" placeholder="e.g. after vacation" />
    </Form>
  );
}

function formatDelta(value: number, unit: string): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded} ${unit}`;
}
