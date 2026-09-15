import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { LDFlag } from "../types";
import { getFlagUrl } from "../utils/ld-urls";
import { getFullName } from "../utils/avatarUtils";
import { formatDate, formatVariation, formatVariationLabel } from "../utils/format";
import { FlagActionContext, FlagOpenActions, FlagSecondaryActions } from "./FlagActions";

interface FlagDetailsHeaderProps extends FlagActionContext {
  flag: LDFlag;
  environmentOrder: string[];
}

/** Flag-level metadata shared by the list detail panel and the details view. */
export function FlagMetadata({ flag }: { flag: LDFlag }) {
  const maintainer = flag._maintainer;
  const team = flag._maintainerTeam;
  const hasStatus = flag.archived || flag.temporary || flag.deprecated;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Name" text={flag.name || flag.key} />
      <List.Item.Detail.Metadata.Label title="Key" text={flag.key} />
      <List.Item.Detail.Metadata.Label title="Description" text={flag.description || "No description"} />
      <List.Item.Detail.Metadata.Label title="Kind" text={flag.kind || "N/A"} />
      <List.Item.Detail.Metadata.Label title="Created" text={formatDate(flag.creationDate)} />

      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.TagList title="Status">
        {flag.archived && <List.Item.Detail.Metadata.TagList.Item text="Archived" color={Color.Yellow} />}
        {flag.temporary && <List.Item.Detail.Metadata.TagList.Item text="Temporary" color={Color.Blue} />}
        {flag.deprecated && <List.Item.Detail.Metadata.TagList.Item text="Deprecated" color={Color.Red} />}
        {!hasStatus && <List.Item.Detail.Metadata.TagList.Item text="Live" color={Color.Green} />}
      </List.Item.Detail.Metadata.TagList>

      <List.Item.Detail.Metadata.TagList title="Tags">
        {flag.tags && flag.tags.length > 0 ? (
          flag.tags.map((tag) => <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />)
        ) : (
          <List.Item.Detail.Metadata.TagList.Item text="No tags" color={Color.SecondaryText} />
        )}
      </List.Item.Detail.Metadata.TagList>

      {(maintainer || team) && (
        <>
          <List.Item.Detail.Metadata.Separator />
          {maintainer && <List.Item.Detail.Metadata.Label title="Maintainer" text={getFullName(maintainer) || "N/A"} />}
          {maintainer?.email && <List.Item.Detail.Metadata.Label title="Email" text={maintainer.email} />}
          {team && <List.Item.Detail.Metadata.Label title="Team" text={team.name || team.key || "N/A"} />}
        </>
      )}

      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Variations" />
      {flag.variations?.map((variation, index) => {
        const notes = [
          flag.defaults?.onVariation === index ? "default on" : "",
          flag.defaults?.offVariation === index ? "default off" : "",
        ].filter(Boolean);
        return (
          <List.Item.Detail.Metadata.Label
            key={variation._id ?? index}
            title={formatVariationLabel(index)}
            text={`${formatVariation(variation)}${notes.length ? ` (${notes.join(", ")})` : ""}`}
          />
        );
      })}
    </List.Item.Detail.Metadata>
  );
}

export default function FlagDetailsHeader({ flag, environmentOrder, ...context }: FlagDetailsHeaderProps) {
  const url = getFlagUrl(context.projectKey, flag.key, Object.keys(flag.environments ?? {}), environmentOrder);

  return (
    <List.Item
      icon={Icon.Info}
      title="Feature Flag Information"
      detail={<List.Item.Detail metadata={<FlagMetadata flag={flag} />} />}
      actions={
        <ActionPanel>
          <FlagOpenActions flag={flag} url={url} {...context} />
          <FlagSecondaryActions flag={flag} url={url} {...context} />
        </ActionPanel>
      }
    />
  );
}
