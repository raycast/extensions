import { State } from "@lib/haapi";
import { formatToHumanDateTime, stringToDate } from "@lib/utils";
import { Action, ActionPanel, List } from "@raycast/api";
import { useState } from "react";
import { getChartMarkdownAsync } from "@components/charts/chart";
import { showFailureToast, useCachedPromise } from "@raycast/utils";

function ListDetail(props: { state: State; k: string }) {
  const { isLoading, data } = useCachedPromise(getChartMarkdownAsync, [props.state], {
    onError: (error) => {
      showFailureToast(error, { title: "Failed to load chart." });
    },
  });

  return <List.Item.Detail isLoading={isLoading} markdown={data} />;
}

function ListAttributeItem(props: { attributeKey: string; value: string | undefined; tooltip?: string; state: State }) {
  const k = props.attributeKey;
  const v = props.value || "?";
  const state = props.state;

  return (
    <List.Item
      id={k}
      title={k}
      detail={k === "state" ? <ListDetail state={state} k={k} /> : undefined}
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

function TimestampItems({ state: s }: { state: State }) {
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

export function EntityAttributesList({ state }: { state: State }) {
  const title = state.attributes.friendly_name
    ? `${state.attributes.friendly_name} (${state.entity_id})`
    : `${state.entity_id}`;

  const [showDetails, setShowDetails] = useState<boolean>(false);

  return (
    <List
      onSelectionChange={(e) => (e === "state" ? setShowDetails(true) : setShowDetails(false))}
      searchBarPlaceholder="Search entity attributes"
      navigationTitle="Attributes"
      isShowingDetail={showDetails}
    >
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
