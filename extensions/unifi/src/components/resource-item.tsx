import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { ReactNode } from "react";
import type { JsonObject, JsonValue } from "../api/types";

function displayValue(value: JsonValue | undefined): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const compact = value.filter((item) => item !== null && typeof item !== "object").join(", ");
    return compact || `${value.length} items`;
  }
  return JSON.stringify(value);
}

export function resourceTitle(item: JsonObject, fallback: string): string {
  for (const key of [
    "name",
    "displayName",
    "workspace_name",
    "title",
    "modelKey",
    "id",
    "workspace_id",
    "siteId",
    "hostId",
  ]) {
    const value = displayValue(item[key]);
    if (value) return value;
  }
  return fallback;
}

export function resourceSubtitle(item: JsonObject): string | undefined {
  for (const key of ["ipAddress", "macAddress", "mac", "type", "model", "description", "state"]) {
    const value = displayValue(item[key]);
    if (value) return value;
  }
  return undefined;
}

export function resourceKeywords(item: JsonObject): string[] {
  return ["id", "name", "displayName", "ipAddress", "macAddress", "mac", "model", "modelKey", "type", "state"]
    .map((key) => displayValue(item[key]))
    .filter((value): value is string => Boolean(value));
}

function isStateKey(key: string): boolean {
  return key.toLowerCase().includes("state") || key.toLowerCase().startsWith("is");
}

export function ResourceMetadata({ item }: { item: JsonObject }) {
  const entries = Object.entries(item)
    .filter(([, value]) => displayValue(value) !== undefined)
    .slice(0, 24);

  return (
    <List.Item.Detail.Metadata>
      {entries.map(([key, value]) => {
        const text = displayValue(value);
        const icon =
          isStateKey(key) && (text === "ONLINE" || text === "true")
            ? { source: Icon.CircleProgress100, tintColor: Color.Green }
            : isStateKey(key) && (text === "OFFLINE" || text === "false")
              ? { source: Icon.Circle, tintColor: Color.Red }
              : undefined;
        return <List.Item.Detail.Metadata.Label key={key} title={key} text={text} icon={icon} />;
      })}
    </List.Item.Detail.Metadata>
  );
}

export function ResourceItem({
  item,
  fallbackTitle,
  actions,
}: {
  item: JsonObject;
  fallbackTitle: string;
  actions?: ReactNode;
}) {
  const title = resourceTitle(item, fallbackTitle);
  const id = displayValue(item.id) || `${fallbackTitle}-${JSON.stringify(item)}`;
  const rawJson = JSON.stringify(item, null, 2);

  return (
    <List.Item
      id={id}
      title={title}
      subtitle={resourceSubtitle(item)}
      keywords={resourceKeywords(item)}
      accessories={item.state ? [{ text: displayValue(item.state) }] : undefined}
      detail={<List.Item.Detail metadata={<ResourceMetadata item={item} />} />}
      actions={
        actions ?? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy JSON" content={rawJson} />
            {item.id ? <Action.CopyToClipboard title="Copy ID" content={String(item.id)} /> : null}
          </ActionPanel>
        )
      }
    />
  );
}
