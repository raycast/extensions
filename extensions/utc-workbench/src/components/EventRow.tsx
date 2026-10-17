import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { extractTime, trimOrNull } from "../lib/format";
import type { Event, ParsedTimestamp } from "../types";
import { TextInputForm } from "./TextInputForm";
import { ManualEventForm } from "./ManualEventForm";
import { TimestampDetail } from "./TimestampDetail";
import { type BaseRowProps, CompareActions, NewEventSection } from "./action-sections";

type EventRowProps = BaseRowProps & {
  readonly event: Event;
  readonly onEdit: (id: string, parsed: ParsedTimestamp) => Promise<void> | void;
  readonly onRelabel: (id: string, label: string | null) => Promise<void> | void;
  readonly onSetUrl: (id: string, url: string | null) => Promise<void> | void;
  readonly onSetData: (id: string, data: string) => Promise<void> | void;
  readonly onRemove: (id: string) => Promise<void> | void;
  readonly onDeleteSession: () => Promise<void> | void;
  readonly timelineMarkdown: string;
  readonly timelineJson: string;
  readonly timelineCsv: string;
};

export function EventRow({
  event,
  itemId,
  offset,
  referenceId,
  onEdit,
  onRelabel,
  onSetUrl,
  onSetData,
  onRemove,
  onDeleteSession,
  onPin,
  onSetReference,
  onClearReference,
  timelineMarkdown,
  timelineJson,
  timelineCsv,
  sessionActions,
}: EventRowProps) {
  const subtitle = event.label;
  const isRef = referenceId === itemId;

  return (
    <List.Item
      id={itemId}
      icon={isRef ? { source: Icon.BullsEye, tintColor: Color.Blue } : event.label ? Icon.Tag : Icon.Clock}
      title={extractTime(event.iso)}
      {...(subtitle !== null ? { subtitle } : {})}
      detail={<TimestampDetail kind="event" event={event} offset={offset} isReference={referenceId === itemId} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Event">
            <Action.Push
              title="Edit Event"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={<ManualEventForm initialEvent={event} onSubmit={(parsed) => onEdit(event.id, parsed)} />}
            />
            <Action.Push
              title={event.label ? "Edit Label" : "Add Label"}
              icon={Icon.Tag}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              target={
                <TextInputForm
                  title={`Label for ${extractTime(event.iso)}`}
                  fieldTitle="Label"
                  placeholder="e.g., api-gw, postgres, auth-service"
                  initialValue={event.label ?? ""}
                  onSubmit={(label) => onRelabel(event.id, trimOrNull(label))}
                />
              }
            />
            <Action.Push
              title={event.url ? "Edit URL" : "Add URL"}
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
              target={
                <TextInputForm
                  title={`URL for ${extractTime(event.iso)}`}
                  fieldTitle="URL"
                  placeholder="e.g., https://grafana.internal/d/abc123"
                  initialValue={event.url ?? ""}
                  onSubmit={(url) => onSetUrl(event.id, trimOrNull(url))}
                />
              }
            />
            <Action.Push
              title="Edit Data"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              target={
                <TextInputForm
                  title={`Data for ${extractTime(event.iso)}`}
                  fieldTitle="Data"
                  placeholder="Log line, annotation, or any context"
                  initialValue={event.data}
                  multiline
                  onSubmit={(data) => onSetData(event.id, data)}
                />
              }
            />
            {event.url ? (
              <Action.OpenInBrowser
                title="Open URL"
                url={event.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
              />
            ) : null}
          </ActionPanel.Section>
          <CompareActions
            itemId={itemId}
            referenceId={referenceId}
            onSetReference={onSetReference}
            onClearReference={onClearReference}
          />
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Utc" content={event.iso} />
            <Action.CopyToClipboard title="Copy Local" content={event.local} />
            <Action.CopyToClipboard title="Copy Data" content={event.data} />
            {event.url ? <Action.CopyToClipboard title="Copy URL" content={event.url} /> : null}
            <Action.CopyToClipboard
              title="Copy Timeline as Markdown"
              content={timelineMarkdown}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            />
            <Action.CopyToClipboard
              title="Copy Timeline as JSON"
              content={timelineJson}
              shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
            />
            <Action.CopyToClipboard
              title="Copy Timeline as Csv"
              content={timelineCsv}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          <NewEventSection onPin={onPin} />
          {sessionActions}
          <ActionPanel.Section title="Danger">
            <Action
              title="Delete Event"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "delete" }}
              onAction={() => {
                void onRemove(event.id);
              }}
            />
            <Action
              title="Delete Session"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "delete" }}
              onAction={() => {
                void onDeleteSession();
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
