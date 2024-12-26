import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { LegoSet } from "../../types/set";

export const LegoSetListEntry = ({ set }: { set: LegoSet }) => {
  return (
    <List.Item
      icon={set.set_img_url ?? "https://rebrickable.com/static/img/nil.png"}
      title={set.name}
      accessories={[{ text: set.year.toString(), icon: Icon.Calendar }]}
      detail={set && <LegoSetDetail set={set} />}
      actions={<LegoSetActionPanel set={set} />}
    />
  );
};

const LegoSetDetail = ({ set }: { set: LegoSet }) => {
  return <List.Item.Detail markdown={`![${set.name}](${set.set_img_url})`} metadata={<LegoSetMetaData set={set} />} />;
};

const LegoSetMetaData = ({ set }: { set: LegoSet }) => {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Name" text={set.name} />
      <List.Item.Detail.Metadata.Label title="Release year" text={set.year.toString()} />
      <List.Item.Detail.Metadata.Label title="Num. of parts" text={set.num_parts.toString()} />
      <List.Item.Detail.Metadata.Label title="Set number" text={set.set_num} />
    </List.Item.Detail.Metadata>
  );
};

const LegoSetActionPanel = ({ set }: { set: LegoSet }) => {
  return (
    <ActionPanel>
      <Action.OpenInBrowser title="View on Rebrickable" url={set.set_url} />
    </ActionPanel>
  );
};
