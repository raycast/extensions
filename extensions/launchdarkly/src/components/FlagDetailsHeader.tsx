import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { LDFlag } from "../types";
import { getLDUrlWithEnvs } from "../utils/ld-urls";

interface FlagDetailsHeaderProps {
  flag: LDFlag;
  environmentOrder: string[];
}

export default function FlagDetailsHeader({ flag, environmentOrder }: FlagDetailsHeaderProps) {
  const maintainer = flag._maintainer;
  const maintainerTeam = flag._maintainerTeam;

  return (
    <List.Item
      icon={Icon.Info}
      title="Feature Flag Information"
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={flag.name || flag.key} />
              <List.Item.Detail.Metadata.Label title="Key" text={flag.key} />
              <List.Item.Detail.Metadata.Label title="Description" text={flag.description || "No description"} />
              <List.Item.Detail.Metadata.Label title="Kind" text={flag.kind || "N/A"} />
              <List.Item.Detail.Metadata.Label
                title="Created"
                text={flag.creationDate ? new Date(flag.creationDate).toLocaleDateString() : "N/A"}
              />

              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.TagList title="Status">
                {flag.archived && <List.Item.Detail.Metadata.TagList.Item text="Archived" color={Color.Yellow} />}
                {flag.temporary && <List.Item.Detail.Metadata.TagList.Item text="Temporary" color={Color.Blue} />}
                {flag.deprecated && <List.Item.Detail.Metadata.TagList.Item text="Deprecated" color={Color.Red} />}
              </List.Item.Detail.Metadata.TagList>

              <List.Item.Detail.Metadata.TagList title="Tags">
                {flag.tags && flag.tags.length > 0 ? (
                  flag.tags.map((tag) => <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />)
                ) : (
                  <List.Item.Detail.Metadata.TagList.Item text="No tags" color={Color.SecondaryText} />
                )}
              </List.Item.Detail.Metadata.TagList>

              {maintainer && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Maintainer" />
                  <List.Item.Detail.Metadata.Label
                    title="Name"
                    text={`${maintainer.firstName || ""} ${maintainer.lastName || ""}`.trim() || "N/A"}
                  />
                  <List.Item.Detail.Metadata.Label title="Email" text={maintainer.email || "N/A"} />
                  {maintainerTeam && (
                    <List.Item.Detail.Metadata.Label
                      title="Team"
                      text={maintainerTeam.name || maintainerTeam.key || "N/A"}
                    />
                  )}
                </>
              )}

              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Variations" />
              {flag.variations?.map((variation, index) => (
                <List.Item.Detail.Metadata.Label
                  key={index}
                  title={`Variation ${index}`}
                  text={variation.name || JSON.stringify(variation.value)}
                />
              ))}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            icon={Icon.Globe}
            title="Open in Launchdarkly"
            url={getLDUrlWithEnvs(flag, environmentOrder)}
          />
          <Action.CopyToClipboard title="Copy Feature Flag Key" content={flag.key} />
        </ActionPanel>
      }
    />
  );
}
