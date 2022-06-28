import { Icon, List } from "@raycast/api";
import { fromNow } from "../../time";
import { Team } from "../../types";
import CopyToClipboardActionPanel from "../action-panels/copy-to-clipboard";

type Props = {
  team: Team;
};

const SelectedTeamSection = ({ team }: Props) => {
  const { description, createdAt, id, membership, name, resourceConfig } = team;

  const ListItem = ({ title, subtitle }: { title: string; subtitle: string }) => {
    return (
      <List.Item
        title={title}
        subtitle={subtitle}
        icon={Icon.Clipboard}
        actions={<CopyToClipboardActionPanel text={subtitle} />}
      />
    );
  };

  return (
    <List.Section title={`Team information`}>
      {description && <List.Item title="Description" subtitle={description} />}
      <List.Item title="Name" subtitle={name} />
      <List.Item title="ID" subtitle={id} />
      <List.Item title="Created" subtitle={fromNow(createdAt)} />
      {membership && <List.Item title="Your role" subtitle={membership.role} />}
      {resourceConfig && <List.Item title="Concurrent builds " subtitle={resourceConfig.concurrentBuilds.toString()} />}
    </List.Section>
  );
};

export default SelectedTeamSection;
