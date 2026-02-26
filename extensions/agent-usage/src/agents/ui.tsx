import { Image, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import type { Accessory } from "./types";

type ErrorLike = { type: string; message: string };

function getProgressColor(percent: number): string {
  if (percent >= 50) return "#30D158";
  if (percent >= 20) return "#FF9F0A";
  return "#FF453A";
}

export function generatePieIcon(percent: number): Image.ImageLike {
  const p = Math.max(0, Math.min(100, percent));
  return getProgressIcon(p / 100, getProgressColor(p));
}

export function renderErrorDetail(error: { type: string; message: string }): React.ReactNode {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Status" text="Error" />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Error Type" text={error.type} />
      <List.Item.Detail.Metadata.Label title="Message" text={error.message} />
    </List.Item.Detail.Metadata>
  );
}

export function renderNoDataDetail(): React.ReactNode {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Status" text="No data available" />
    </List.Item.Detail.Metadata>
  );
}

export function getLoadingAccessory(label: string): Accessory {
  return { text: "Loading...", tooltip: `Fetching ${label} usage data` };
}

export function getNoDataAccessory(): Accessory {
  return { text: "—", tooltip: "No data available" };
}

/** Returns an error/no-data fallback ReactNode, or null if data is available. */
export function renderErrorOrNoData(usage: unknown, error: ErrorLike | null): React.ReactNode | null {
  if (error) return renderErrorDetail(error);
  if (!usage) return renderNoDataDetail();
  return null;
}

/** Returns an error/no-data fallback string, or null if data is available. */
export function formatErrorOrNoData(agentName: string, usage: unknown, error: ErrorLike | null): string | null {
  if (error) return `${agentName} Usage\nStatus: Error\nType: ${error.type}\nMessage: ${error.message}`;
  if (!usage) return `${agentName} Usage\nStatus: No data available`;
  return null;
}
