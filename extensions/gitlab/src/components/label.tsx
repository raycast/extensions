import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { Label } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { ensureCleanAccessories } from "../utils";

export function LabelDetail(props: { label: Label }): JSX.Element {
  const l = props.label;
  let md = `## Color\n${l.color}`;
  if (l.description) {
    md += `\n## Description\n${l.description}`;
  }
  return <Detail markdown={md} />;
}

export function LabelListItem(props: { label: Label }): JSX.Element {
  const l = props.label;
  const accessoryTitle = Object.keys(l).includes("subscribed") && l.subscribed ? "subscribed" : undefined;
  return (
    <List.Item
      key={l.id.toString()}
      title={l.name}
      icon={{ source: Icon.Circle, tintColor: l.color }}
      accessories={ensureCleanAccessories([{ text: accessoryTitle }])}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            target={<LabelDetail label={l} />}
            icon={{ source: GitLabIcons.show_details, tintColor: Color.PrimaryText }}
          />
          <Action.CopyToClipboard title="Copy Color" content={l.color} />
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
}): JSX.Element {
  return (
    <List
      searchBarPlaceholder="Search labels by name"
      onSearchTextChange={props.onSearchTextChange}
      isLoading={props.isLoading}
      throttle={props.throttle}
    >
      <List.Section title={props.title}>
        {props.labels.map((l) => (
          <LabelListItem key={l.id.toString()} label={l} />
        ))}
      </List.Section>
    </List>
  );
}
