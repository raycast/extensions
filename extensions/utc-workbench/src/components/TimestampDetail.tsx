import { Color, List } from "@raycast/api";
import { formatRelative } from "../lib/format";
import type { Event, ParsedTimestamp } from "../types";

type TimestampDetailProps = (
  | {
      readonly kind: "parsed";
      readonly parsed: ParsedTimestamp;
    }
  | {
      readonly kind: "event";
      readonly event: Event;
    }
) & {
  readonly offset: string | null;
  /**
   * True when this row is the *explicit* reference (set via "Set as
   * Reference"), as opposed to the implicit selection-follows-reference
   * behavior. Drives the "Reference" tag in the metadata panel.
   */
  readonly isReference: boolean;
};

// Shortcut-prefixed field titles (⌘ adjacent to the first letter, which is the hotkey).
const LABEL_TITLE = "\u2318Label";
const URL_TITLE = "\u2318URL";
const DATA_TITLE = "\u2318Data";
const EMPTY = "—";

const HINTS_PARSED = "\u21A9 Pin  \u00B7  \u2318L Label  \u00B7  \u2318U URL  \u00B7  \u2318D Data";
const HINTS_EVENT =
  "\u2318R Set Reference  \u00B7  \u2303\u232B Delete Event  \u00B7  \u2303\u21E7\u232B Delete Session";

export function TimestampDetail(props: TimestampDetailProps) {
  const base = props.kind === "parsed" ? props.parsed : props.event;
  const relative = formatRelative(base.timestamp);
  const ambiguous = props.kind === "parsed" && props.parsed.ambiguous;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {props.kind === "parsed" ? (
            <>
              {props.parsed.source ? (
                <List.Item.Detail.Metadata.Label title="Detected Date String" text={props.parsed.source} />
              ) : null}
              <List.Item.Detail.Metadata.TagList title="Format">
                <List.Item.Detail.Metadata.TagList.Item text={props.parsed.format} color={Color.SecondaryText} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
            </>
          ) : null}
          {ambiguous ? (
            <>
              <List.Item.Detail.Metadata.TagList title="Timezone">
                <List.Item.Detail.Metadata.TagList.Item text="Required — select a zone" color={Color.Orange} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title="Interpret as" text="↩ UTC      ⌘T Local      ⌘⇧T Pick zone" />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="UTC" text={`${base.iso}  (tentative)`} />
              <List.Item.Detail.Metadata.Label title="Local" text={`${base.local}  (tentative)`} />
            </>
          ) : (
            <>
              <List.Item.Detail.Metadata.Label title="UTC" text={base.iso} />
              <List.Item.Detail.Metadata.Label title="Local" text={base.local} />
              <List.Item.Detail.Metadata.Label title="Relative" text={relative} />
              {props.isReference ? (
                <List.Item.Detail.Metadata.TagList title="Offset">
                  <List.Item.Detail.Metadata.TagList.Item text="Reference (Δ = 0)" color={Color.Blue} />
                </List.Item.Detail.Metadata.TagList>
              ) : props.offset !== null ? (
                <List.Item.Detail.Metadata.TagList title="Δ from ref">
                  <List.Item.Detail.Metadata.TagList.Item text={props.offset} color={Color.Blue} />
                </List.Item.Detail.Metadata.TagList>
              ) : null}
            </>
          )}
          <List.Item.Detail.Metadata.Separator />
          {base.label !== null ? (
            <List.Item.Detail.Metadata.TagList title={LABEL_TITLE}>
              <List.Item.Detail.Metadata.TagList.Item text={base.label} />
            </List.Item.Detail.Metadata.TagList>
          ) : (
            <List.Item.Detail.Metadata.Label title={LABEL_TITLE} text={EMPTY} />
          )}
          {base.url !== null ? (
            <List.Item.Detail.Metadata.Link title={URL_TITLE} text={base.url} target={base.url} />
          ) : (
            <List.Item.Detail.Metadata.Label title={URL_TITLE} text={EMPTY} />
          )}
          <List.Item.Detail.Metadata.Label title={DATA_TITLE} text={base.data || EMPTY} />
          {!ambiguous ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title={props.kind === "event" ? HINTS_EVENT : HINTS_PARSED} text="" />
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
