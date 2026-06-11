import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { DateTime } from "luxon";
import { extractTime, trimOrNull } from "../lib/format";
import type { ParsedTimestamp } from "../types";
import { TextInputForm } from "./TextInputForm";
import { TimezoneForm } from "./TimezoneForm";
import { TimestampDetail } from "./TimestampDetail";
import { type BaseRowProps, CompareActions, NewEventSection } from "./action-sections";

type ParsedRowProps = BaseRowProps & {
  readonly result: ParsedTimestamp;
  readonly index: number;
  readonly parsedCount: number;
  readonly onResolveTimezone: (index: number, zone: string) => void;
  readonly onUpdateParsed: (index: number, patch: Partial<ParsedTimestamp>) => void;
  readonly onPinAll: (label?: string) => Promise<void> | void;
};

export function ParsedRow({
  itemId,
  result: r,
  index: i,
  offset,
  referenceId,
  parsedCount,
  onResolveTimezone,
  onUpdateParsed,
  onPin,
  onPinAll,
  onSetReference,
  onClearReference,
  sessionActions,
}: ParsedRowProps) {
  const subtitle = r.ambiguous ? "No timezone — select one" : r.label;
  const isRef = referenceId === itemId;

  return (
    <List.Item
      id={itemId}
      icon={
        isRef ? { source: Icon.BullsEye, tintColor: Color.Blue } : r.ambiguous ? Icon.Warning : Icon.MagnifyingGlass
      }
      title={r.iso}
      {...(subtitle !== null ? { subtitle } : {})}
      detail={<TimestampDetail kind="parsed" parsed={r} offset={offset} isReference={referenceId === itemId} />}
      actions={
        <ActionPanel>
          {r.ambiguous ? (
            <ActionPanel.Section title="Timezone">
              <Action
                title="Interpret as Utc"
                icon={Icon.Globe}
                onAction={() => {
                  onResolveTimezone(i, "utc");
                }}
              />
              <Action
                title="Interpret as Local"
                icon={Icon.Clock}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                onAction={() => {
                  onResolveTimezone(i, DateTime.local().zoneName);
                }}
              />
              <Action.Push
                title="Select Timezone"
                icon={Icon.Globe}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                target={
                  <TimezoneForm
                    title={`Timezone for ${extractTime(r.iso)}`}
                    onSubmit={(zone) => {
                      onResolveTimezone(i, zone);
                    }}
                  />
                }
              />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section title="Pin">
            <Action
              title="Pin to Timeline"
              icon={Icon.Pin}
              onAction={() => {
                void onPin(r);
              }}
            />
            {parsedCount > 1 ? (
              <>
                <Action
                  title="Pin All"
                  icon={Icon.PlusCircle}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                  onAction={() => {
                    void onPinAll();
                  }}
                />
                <Action.Push
                  title="Pin All with Label"
                  icon={Icon.Tag}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                  target={
                    <TextInputForm
                      title={`Label for ${parsedCount.toString()} timestamps`}
                      fieldTitle="Label"
                      placeholder="e.g., api-gw, postgres, auth-service"
                      onSubmit={(label) => onPinAll(label)}
                    />
                  }
                />
              </>
            ) : null}
          </ActionPanel.Section>
          <CompareActions
            itemId={itemId}
            referenceId={referenceId}
            onSetReference={onSetReference}
            onClearReference={onClearReference}
          />
          <ActionPanel.Section title="Metadata">
            <Action.Push
              title={r.label ? "Edit Label" : "Add Label"}
              icon={Icon.Tag}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              target={
                <TextInputForm
                  title={`Label for ${extractTime(r.iso)}`}
                  fieldTitle="Label"
                  placeholder="e.g., api-gw, postgres, auth-service"
                  initialValue={r.label ?? ""}
                  onSubmit={(label) => {
                    onUpdateParsed(i, { label: trimOrNull(label) });
                  }}
                />
              }
            />
            <Action.Push
              title={r.url ? "Edit URL" : "Add URL"}
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
              target={
                <TextInputForm
                  title={`URL for ${extractTime(r.iso)}`}
                  fieldTitle="URL"
                  placeholder="e.g., https://grafana.internal/d/abc123"
                  initialValue={r.url ?? ""}
                  onSubmit={(url) => {
                    onUpdateParsed(i, { url: trimOrNull(url) });
                  }}
                />
              }
            />
            <Action.Push
              title="Edit Data"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              target={
                <TextInputForm
                  title={`Data for ${extractTime(r.iso)}`}
                  fieldTitle="Data"
                  placeholder="Log line, annotation, or any context"
                  initialValue={r.data}
                  multiline
                  onSubmit={(data) => {
                    onUpdateParsed(i, { data });
                  }}
                />
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Utc" content={r.iso} />
            <Action.CopyToClipboard title="Copy Local" content={r.local} />
            {r.url ? <Action.CopyToClipboard title="Copy URL" content={r.url} /> : null}
          </ActionPanel.Section>
          <NewEventSection onPin={onPin} />
          {sessionActions}
        </ActionPanel>
      }
    />
  );
}
