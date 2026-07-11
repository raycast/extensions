import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import { Label } from "../gitlabapi";

export function LabelListItem(props: { label: Label }) {
  return (
    <List.Item
      key={props.label.id.toString()}
      title={props.label.name}
      icon={{ source: Icon.Circle, tintColor: props.label.color }}
      accessories={[
        {
          text: Object.keys(props.label).includes("subscribed") && props.label.subscribed ? "subscribed" : undefined,
        },
      ]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Color" content={props.label.color} />
        </ActionPanel>
      }
    />
  );
}

export function LabelList(props: {
  labels: Label[];
  title?: string | undefined;
  onSearchTextChange?: ((text: string) => void) | undefined;
  isLoading?: boolean | undefined;
  throttle?: boolean | undefined;
  navigationTitle?: string;
}) {
  const visibleLabels = useMemo(() => props.labels.filter((label) => label && label.id), [props.labels]);

  return (
    <List
      searchBarPlaceholder="Search labels by name"
      onSearchTextChange={props.onSearchTextChange}
      isLoading={props.isLoading}
      throttle={props.throttle}
      navigationTitle={props.navigationTitle}
    >
      <List.Section title={props.title}>
        {visibleLabels.map((label) => (
          <LabelListItem key={label.id.toString()} label={label} />
        ))}
      </List.Section>
    </List>
  );
}
