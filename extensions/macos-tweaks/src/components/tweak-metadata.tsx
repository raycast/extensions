import { Color, List } from "@raycast/api";
import { CATEGORY_META } from "../types";
import type { TweakState } from "../types";
import { getCommandString } from "../utils/defaults";
import { formatDefault, formatValue } from "../utils/format";

/**
 * The detail pane, as native metadata rather than hand-built markdown: the status and risk read
 * as coloured tags, and the domain and key line up as labels the way the rest of Raycast shows
 * key/value data.
 */
export function TweakMetadata({ tweak }: { tweak: TweakState }) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Description" text={tweak.description} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.TagList title="Status">
        <List.Item.Detail.Metadata.TagList.Item
          text={tweak.isModified ? "Modified" : "Default"}
          color={tweak.isModified ? Color.Orange : Color.SecondaryText}
        />
        <List.Item.Detail.Metadata.TagList.Item
          text={tweak.risk === "moderate" ? "Moderate risk" : "Safe"}
          color={tweak.risk === "moderate" ? Color.Yellow : Color.Green}
        />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Label title="Current Value" text={formatValue(tweak)} />
      <List.Item.Detail.Metadata.Label title="Default Value" text={formatDefault(tweak)} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Category" text={CATEGORY_META[tweak.category].title} />
      <List.Item.Detail.Metadata.Label title="Domain" text={tweak.domain} />
      <List.Item.Detail.Metadata.Label title="Key" text={tweak.key} />
      {tweak.requiresRestart ? <List.Item.Detail.Metadata.Label title="Restarts" text={tweak.requiresRestart} /> : null}
      {tweak.minMacOS ? (
        <List.Item.Detail.Metadata.Label title="Requires" text={`macOS ${tweak.minMacOS} or later`} />
      ) : null}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Command" text={getCommandString(tweak, tweak.currentValue)} />
    </List.Item.Detail.Metadata>
  );
}

/** Domain and key are how these settings are named in every guide, so they must be searchable. */
export function tweakKeywords(tweak: TweakState): string[] {
  return [tweak.domain, tweak.key, ...tweak.tags];
}
