import { Color, Icon, List } from "@raycast/api";
import { type ReactNode } from "react";
import { BenchmarkEvent, BenchmarkPhase } from "../benchmark/protocol";
import { BenchmarkTarget } from "../benchmark/targets";
import { formatBinaryBytes, formatDuration, formatSpeed } from "../presentation/format";

interface BenchmarkRunningListProps {
  event?: BenchmarkEvent;
  target: BenchmarkTarget;
  actions: ReactNode;
}

interface PhaseDefinition {
  id: BenchmarkPhase;
  title: string;
  activeDescription: string;
}

const phases: PhaseDefinition[] = [
  { id: "preparing", title: "Preparing Disk", activeDescription: "Creating a private temporary benchmark file" },
  { id: "warmup", title: "Warm Up", activeDescription: "Stabilizing the transfer rate" },
  { id: "write", title: "Sequential Write", activeDescription: "Measuring write performance" },
  { id: "read", title: "Sequential Read", activeDescription: "Measuring read performance" },
  { id: "cleanup", title: "Cleanup", activeDescription: "Removing temporary data" },
];

export function BenchmarkRunningList({ event, target, actions }: BenchmarkRunningListProps) {
  const snapshot = progressSnapshot(event);

  return (
    <List
      isLoading
      navigationTitle="Disk Speed Test"
      searchBarPlaceholder="Benchmark in Progress"
      selectedItemId={`phase-${snapshot.phase}`}
    >
      <List.Section
        title="Progress"
        subtitle={`${formatBinaryBytes(target.maxBytes)} · up to ${formatDuration(target.targetDurationSeconds)} per phase`}
      >
        {phases.map((phase) => {
          const status = phaseStatus(phase.id, snapshot.phase, event?.type === "completed");
          const accessories: List.Item.Accessory[] = [];
          if (status === "active" && snapshot.throughputMBps > 0) {
            accessories.push({ text: formatSpeed(snapshot.throughputMBps) });
          }
          accessories.push({
            tag: {
              value: status === "active" ? `${Math.round(snapshot.progress * 100)}%` : capitalize(status),
              color: statusColor(status),
            },
          });
          return (
            <List.Item
              key={phase.id}
              id={`phase-${phase.id}`}
              title={phase.title}
              subtitle={status === "active" ? phase.activeDescription : capitalize(status)}
              icon={{ source: statusIcon(status, snapshot.progress), tintColor: statusColor(status) }}
              accessories={accessories}
              actions={actions}
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function progressSnapshot(event?: BenchmarkEvent): {
  phase: BenchmarkPhase;
  progress: number;
  throughputMBps: number;
} {
  if (event?.type === "progress") {
    return {
      phase: event.phase,
      progress: Math.max(0, Math.min(1, event.progress)),
      throughputMBps: event.throughputMBps,
    };
  }
  if (event?.type === "completed") return { phase: "cleanup", progress: 1, throughputMBps: 0 };
  return { phase: "preparing", progress: 0, throughputMBps: 0 };
}

function phaseStatus(
  phase: BenchmarkPhase,
  activePhase: BenchmarkPhase,
  completed: boolean,
): "completed" | "active" | "waiting" {
  if (completed) return "completed";
  const phaseIndex = phases.findIndex((candidate) => candidate.id === phase);
  const activeIndex = phases.findIndex((candidate) => candidate.id === activePhase);
  if (phaseIndex < activeIndex) return "completed";
  return phaseIndex === activeIndex ? "active" : "waiting";
}

function statusIcon(status: "completed" | "active" | "waiting", progress: number): Icon {
  switch (status) {
    case "completed":
      return Icon.CheckCircle;
    case "active":
      return progressIcon(progress);
    case "waiting":
      return Icon.Circle;
  }
}

function statusColor(status: "completed" | "active" | "waiting"): Color {
  switch (status) {
    case "completed":
      return Color.Green;
    case "active":
      return Color.Blue;
    case "waiting":
      return Color.SecondaryText;
  }
}

function progressIcon(progress: number): Icon {
  if (progress >= 0.875) return Icon.CircleProgress100;
  if (progress >= 0.625) return Icon.CircleProgress75;
  if (progress >= 0.375) return Icon.CircleProgress50;
  if (progress >= 0.125) return Icon.CircleProgress25;
  return Icon.CircleProgress;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
