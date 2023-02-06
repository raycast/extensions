import { List } from "@raycast/api";
import capitalize from "../helpers/capitalize";
import getDefaultEnabledIcon from "../helpers/getDefaultEnabledIcon";
import parseGroupLabel from "../helpers/parseGroupLabel";
import parseIntroducedBy from "../helpers/parseIntroducedBy";
import parseRollout from "../helpers/parseRollout";
import { Flag } from "../types";

function FlagMetadata(flag: Flag) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title={flag.name} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Default Enabled" icon={getDefaultEnabledIcon(flag.default_enabled)} />
      {flag.group ? <List.Item.Detail.Metadata.Label title="Group" text={parseGroupLabel(flag.group)} /> : null}
      {flag.milestone ? <List.Item.Detail.Metadata.Label title="milestone" text={`%${flag.milestone}`} /> : null}
      {flag.introduced_by_url ? (
        <List.Item.Detail.Metadata.Label title="Introduced By" text={parseIntroducedBy(flag.introduced_by_url)} />
      ) : null}
      {flag.rollout_issue_url ? (
        <List.Item.Detail.Metadata.Label title="Rollout Issue" text={parseRollout(flag.rollout_issue_url)} />
      ) : null}
      {flag.type ? <List.Item.Detail.Metadata.Label title="Type" text={capitalize(flag.type)} /> : null}
    </List.Item.Detail.Metadata>
  );
}

export default FlagMetadata;
