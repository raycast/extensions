import { useMemo } from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import GitProfileForm from "@/components/GitProfileForm";
import type { GitProfileListItemProps } from "./types";

const ALLOWED_EDIT_SCOPES = ["global"];

export default function GitProfileListItem({ profile, revalidate }: GitProfileListItemProps) {
  const isEditable = useMemo(() => ALLOWED_EDIT_SCOPES.includes(profile.scope), [profile.scope]);
  const actions = isEditable ? (
    <ActionPanel>
      <Action.Push
        icon={Icon.Bird}
        title="Edit Profile"
        target={<GitProfileForm scope={profile.scope} profile={profile} revalidate={revalidate} />}
      />
    </ActionPanel>
  ) : undefined;

  return (
    <List.Item
      accessories={[{ text: "scope", tooltip: !isEditable ? "readonly" : "" }]}
      key={profile.scope}
      title={profile.scope}
      icon={{
        source: Icon.Bird,
        tintColor: isEditable ? Color.Yellow : Color.SecondaryText,
      }}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="user.name" text={profile.name || ""} />
              <List.Item.Detail.Metadata.Label title="user.email" text={profile.email || ""} />
              <List.Item.Detail.Metadata.TagList title="scope">
                {!isEditable && <List.Item.Detail.Metadata.TagList.Item text="readonly" color={Color.SecondaryText} />}
                <List.Item.Detail.Metadata.TagList.Item text={profile.scope} />
              </List.Item.Detail.Metadata.TagList>
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={actions}
    />
  );
}
