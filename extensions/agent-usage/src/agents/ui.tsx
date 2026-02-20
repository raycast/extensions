import { List } from "@raycast/api";
import type { Accessory } from "./types";

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
