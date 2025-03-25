import {
  Action,
  ActionPanel,
  Icon,
  List,
  Image,
  LaunchType,
  launchCommand,
  Color,
  Clipboard,
  showToast,
  Toast,
} from "@raycast/api";
import { UserType } from "../lib/types";
import { UserCommandActions, UserCopyActions } from "./actions";

export default function User({ user, revalidate }: { user: UserType; revalidate?: () => void }) {
  return (
    <List.Item
      key={user.id}
      title={user.username}
      icon={{ source: user.avatar, mask: Image.Mask.Circle }}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Name"
                icon={{ source: user.avatar, mask: Image.Mask.Circle }}
                text={user.username}
              />
              {user.pronouns && (
                <List.Item.Detail.Metadata.Label title="Pronouns" text={user.pronouns} icon={Icon.SpeechBubbleActive} />
              )}
              {user.timezone && (
                <List.Item.Detail.Metadata.Label title="Timezone" text={user.timezone} icon={Icon.Clock} />
              )}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Email" icon={Icon.Envelope} text={user.email || "-"} />
              {user.website ? (
                <List.Item.Detail.Metadata.Link title="Website" text={user.website} target={user.website} />
              ) : (
                <List.Item.Detail.Metadata.Label title="Website" text={"-"} />
              )}
              <List.Item.Detail.Metadata.Separator />
              {user.github ? (
                <List.Item.Detail.Metadata.Link title="Github" text={user.github || "-"} target={user.github || ""} />
              ) : (
                <List.Item.Detail.Metadata.Label title="Github" text={"-"} />
              )}
              <List.Item.Detail.Metadata.Link
                title="Scrapbook Profile"
                text={"Open Scrapbook"}
                target={user.customDomain || "https://scrapbook.hackclub.com/" + encodeURIComponent(user.username)}
              />
              <List.Item.Detail.Metadata.TagList title="Posts">
                <List.Item.Detail.Metadata.TagList.Item
                  icon={Icon.ArrowNe}
                  text={"View Posts"}
                  onAction={() => {
                    try {
                      launchCommand({
                        name: "search-users-posts",
                        type: LaunchType.UserInitiated,
                        context: { username: user.username },
                      });
                    } catch (err) {
                      showToast({ title: "Command not enabled", style: Toast.Style.Failure });
                    }
                  }}
                />
              </List.Item.Detail.Metadata.TagList>
              {user.displayStreak == true && (user.streaksToggledOff == null || user.streaksToggledOff == false) && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Streak Count"
                    icon={Icon.Bolt}
                    text={user.streakCount?.toString()}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Highest Streak"
                    icon={Icon.BoltDisabled}
                    text={user.maxStreaks?.toString()}
                  />
                </>
              )}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Member Status">
                {user.newMember ? (
                  <List.Item.Detail.Metadata.TagList.Item text={"New Member"} color={Color.Blue} />
                ) : (
                  <List.Item.Detail.Metadata.TagList.Item text={"-"} />
                )}
                {user.fullSlackMember ? (
                  <List.Item.Detail.Metadata.TagList.Item text={"Full Slack Member"} color={Color.Green} />
                ) : (
                  <List.Item.Detail.Metadata.TagList.Item text={"-"} />
                )}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Scrapbook ID">
                <List.Item.Detail.Metadata.TagList.Item
                  text={user.id}
                  onAction={() => {
                    Clipboard.copy(user.id);
                    showToast({ title: "Copied Scrapbook ID" });
                  }}
                />
              </List.Item.Detail.Metadata.TagList>
              {user.slackID && (
                <List.Item.Detail.Metadata.TagList title="Slack ID">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={user.slackID}
                    onAction={() => {
                      Clipboard.copy(user.slackID!);
                      showToast({ title: "Copied Slack ID" });
                    }}
                  />
                </List.Item.Detail.Metadata.TagList>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        revalidate && (
          <ActionPanel>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={async () => revalidate()} />
            <UserCommandActions user={user} />
            <UserCopyActions user={user} />
          </ActionPanel>
        )
      }
    />
  );
}
