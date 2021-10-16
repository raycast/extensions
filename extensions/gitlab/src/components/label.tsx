import { ActionPanel, CopyToClipboardAction, Detail, List, PushAction } from "@raycast/api";
import { Label } from "../gitlabapi";
import { GitLabIcons } from "../icons";

export function LabelDetail(props: { label: Label }) {
  const l = props.label;
  let md = `## Color\n${l.color}`;
  if (l.description) {
    md += `\n## Description\n${l.description}`;
  }
  return <Detail markdown={md} />;
}

export function LabelItem(props: { label: Label }) {
  const l = props.label;
  return (
    <List.Item
      key={l.id.toString()}
      title={l.name}
      icon={{ source: GitLabIcons.labels, tintColor: l.color }}
      actions={
        <ActionPanel>
          <PushAction title="Show Details" target={<LabelDetail label={l} />} />
          <CopyToClipboardAction title="Copy Color" content={l.color} />
        </ActionPanel>
      }
    />
  );
}

export function LabelList(props: { labels: Label[]; title?: string | undefined }) {
  return (
    <List searchBarPlaceholder="Search labels by name">
      <List.Section title={props.title}>
        {props.labels.map((l) => (
          <LabelItem key={l.id.toString()} label={l} />
        ))}
      </List.Section>
    </List>
  );
}
