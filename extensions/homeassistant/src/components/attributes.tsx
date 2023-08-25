import { ActionPanel, List, Action } from "@raycast/api";
import { State } from "@lib/haapi";
import { formatToHumanDateTime, stringToDate } from "@lib/utils";

function ListAttributeItem(props: {
  attributeKey: string;
  value: string | undefined;
  tooltip?: string;
  state: State;
}): JSX.Element {
  const k = props.attributeKey;
  const v = props.value || "?";
  return (
    <List.Item
      title={k}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Value to Clipboard"
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              content={`${v}`}
            />
            <Action.CopyToClipboard
              title="Copy Key to Clipboard"
              shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
              content={`${k}`}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Entity">
            <Action.CopyToClipboard
              title="Copy Entity ID to Clipboard"
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              content={`${props.state.entity_id}`}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        {
          text: `${v}`,
          tooltip: props.tooltip,
        },
      ]}
    />
  );
}

function TimestampItems(props: { state: State }): JSX.Element | null {
  const s = props.state;
  const lc = stringToDate(s.last_changed);
  const lu = stringToDate(s.last_updated);
  return (
    <>
      <ListAttributeItem
        attributeKey="last_changed"
        value={formatToHumanDateTime(lc)}
        tooltip={lc ? lc.toLocaleString() : undefined}
        state={s}
      />
      <ListAttributeItem
        attributeKey="last_updated"
        value={formatToHumanDateTime(lu)}
        tooltip={lu ? lu.toLocaleString() : undefined}
        state={s}
      />
    </>
  );
}

export function EntityAttributesList(props: { state: State }): JSX.Element {
  const state = props.state;
  const title = state.attributes.friendly_name
    ? `${state.attributes.friendly_name} (${state.entity_id})`
    : `${state.entity_id}`;
  return (
    <List searchBarPlaceholder="Search entity attributes" navigationTitle="Attributes">
      <List.Section title={`Attributes of ${title}`}>
        <ListAttributeItem attributeKey="state" value={`${state.state}`} state={state} />
        <TimestampItems state={state} />
      </List.Section>
      <List.Section title="Status Attributes">
        {Object.entries(state.attributes).map(([k, v]) => (
          <ListAttributeItem key={state.entity_id + k} attributeKey={k} value={v} state={state} />
        ))}
      </List.Section>
    </List>
  );
}
