import { Color, Icon, List } from "@raycast/api";
import { type ReactNode } from "react";
import type { BenchmarkRunConfiguration } from "../benchmark/engine";
import { BenchmarkResult } from "../benchmark/protocol";
import { ResultInterpretation } from "../history/interpretation";
import { capitalize, formatBinaryBytes, formatBytes, formatDuration, formatSpeed } from "../presentation/format";

interface BenchmarkResultListProps {
  result: BenchmarkResult;
  configuration: Pick<BenchmarkRunConfiguration, "maxBytes" | "targetDurationSeconds">;
  interpretation: ResultInterpretation;
  actions: ReactNode;
}

export function BenchmarkResultList({ result, configuration, interpretation, actions }: BenchmarkResultListProps) {
  const baseline = baselinePresentation(interpretation);
  return (
    <List navigationTitle={`${result.volume?.name ?? "Disk"} Results`} searchBarPlaceholder="Filter Results">
      <List.Section title="Performance" subtitle={interpretation.overallTier.title}>
        <List.Item
          id="sequential-write"
          title="Sequential Write"
          subtitle={interpretation.writeTier.title}
          icon={{ source: Icon.Upload, tintColor: Color.Blue }}
          accessories={[{ text: formatSpeed(result.write.megabytesPerSecond) }]}
          actions={actions}
        />
        <List.Item
          id="sequential-read"
          title="Sequential Read"
          subtitle={interpretation.readTier.title}
          icon={{ source: Icon.Download, tintColor: Color.Blue }}
          accessories={[{ text: formatSpeed(result.read.megabytesPerSecond) }]}
          actions={actions}
        />
      </List.Section>
      <List.Section title="Interpretation">
        <List.Item
          id="baseline-comparison"
          title="Baseline Comparison"
          subtitle={baseline.description}
          icon={{ source: baseline.icon, tintColor: baseline.color }}
          accessories={[{ tag: { value: baseline.label, color: baseline.color } }]}
          actions={actions}
        />
        <List.Item
          id="measurement-confidence"
          title="Measurement Confidence"
          subtitle={confidenceSummary(result.confidence)}
          icon={{ source: confidenceIcon(result.confidence), tintColor: confidenceColor(result.confidence) }}
          accessories={[{ text: capitalize(result.confidence) }]}
          actions={actions}
        />
      </List.Section>
      <List.Section title="Test Details" subtitle="Performance test, not a hardware-health diagnosis">
        <List.Item
          id="measured-data"
          title="Measured Data"
          icon={Icon.Document}
          accessories={[{ text: formatBytes(result.measuredBytes) }]}
          actions={actions}
        />
        <List.Item
          id="maximum-test-data"
          title="Maximum Test Data"
          subtitle="Temporary file limit"
          icon={Icon.Document}
          accessories={[{ text: formatBinaryBytes(configuration.maxBytes) }]}
          actions={actions}
        />
        <List.Item
          id="time-target"
          title="Time Target"
          subtitle="Each measured phase"
          icon={Icon.Stopwatch}
          accessories={[{ text: `Up to ${formatDuration(configuration.targetDurationSeconds)}` }]}
          actions={actions}
        />
        <List.Item
          id="methodology"
          title="Methodology"
          icon={Icon.Gauge}
          accessories={[{ text: result.methodologyVersion }]}
          actions={actions}
        />
      </List.Section>
    </List>
  );
}

function baselinePresentation(interpretation: ResultInterpretation) {
  const comparison = interpretation.comparison;
  if (!comparison) {
    return {
      label: "First Result",
      description: "Run again under similar conditions to establish a compatible baseline.",
      icon: Icon.Gauge,
      color: Color.SecondaryText,
    };
  }

  switch (comparison.status) {
    case "provisional":
      return {
        label: "Provisional Baseline",
        description: "A close compatible run will confirm this baseline.",
        icon: Icon.Gauge,
        color: Color.SecondaryText,
      };
    case "normal":
      return {
        label: "Expected Range",
        description: "Performance is within the expected range of your baseline.",
        icon: Icon.CheckCircle,
        color: Color.Green,
      };
    case "higher":
      return {
        label: "Higher",
        description: "Read and write performance are higher than your baseline.",
        icon: Icon.ArrowUpCircle,
        color: Color.Green,
      };
    case "lower":
      return {
        label: "Lower",
        description: "Rerun under quiet conditions before drawing a conclusion.",
        icon: Icon.Warning,
        color: Color.Orange,
      };
    case "consistently-lower":
      return {
        label: "Consistently Lower",
        description: "Performance is lower across compatible runs.",
        icon: Icon.Warning,
        color: Color.Orange,
      };
  }
}

function confidenceIcon(confidence: BenchmarkResult["confidence"]): Icon {
  return confidence === "high" ? Icon.CheckCircle : Icon.Warning;
}

function confidenceSummary(confidence: BenchmarkResult["confidence"]): string {
  switch (confidence) {
    case "high":
      return "Transfer rate remained stable.";
    case "medium":
      return "Moderate variation; compare trends with care.";
    case "low":
      return "High variation; rerun under quieter conditions.";
  }
}

function confidenceColor(confidence: BenchmarkResult["confidence"]): Color {
  switch (confidence) {
    case "high":
      return Color.Green;
    case "medium":
      return Color.Orange;
    case "low":
      return Color.Red;
  }
}
