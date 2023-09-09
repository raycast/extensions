import { AI, Action, ActionPanel, Icon, Keyboard, List, Toast, clearSearchBar, showToast } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { Profile } from "@slack/web-api/dist/response/UsersProfileGetResponse";
import { useState } from "react";
import { getCodeForEmoji, getEmojiForCode } from "./emojiCodes";
import { withOAuthSession } from "./oauth";
import { usePresets } from "./presets";
import { SlackOAuthSessionConfig, useSlack, useSlackProfile } from "./slack";
import { durationToString, statusExpirationText } from "./utils";
import { SlackStatusPreset } from "./interfaces";

const slackOAuthConfig = new SlackOAuthSessionConfig({
  clientId: "851756884692.5546927290212",
  userScopes: ["emoji:read", "users.profile:write", "users.profile:read"],
});

function getStatusIcon(profile: Profile | undefined) {
  if (!profile) {
    return undefined;
  }

  if (!profile.status_emoji) {
    return Icon.SpeechBubble;
  }

  return getEmojiForCode(profile.status_emoji);
}

function getStatusTitle(profile: Profile | undefined) {
  if (!profile) {
    return "";
  }

  if (!profile.status_text) {
    return "No status";
  }

  return profile.status_text;
}

function getStatusSubtitle(profile: Profile | undefined) {
  if (!profile) {
    return undefined;
  }

  if (!profile.status_expiration) {
    return undefined;
  }

  if (profile.status_expiration === 0) {
    return "Don't clear";
  }

  return statusExpirationText(profile.status_expiration);
}

function ClearStatusAction(props: { mutate: MutatePromise<Profile | undefined> }) {
  const slack = useSlack();
  return (
    <Action
      title="Clear Status"
      icon={Icon.XMarkCircle}
      shortcut={Keyboard.Shortcut.Common.Remove}
      onAction={async () => {
        await showToast({ style: Toast.Style.Animated, title: "Clearing status..." });
        try {
          await props.mutate(
            slack.users.profile.set({
              profile: JSON.stringify({
                status_text: "",
                status_expiration: 0,
                status_emoji: "",
              }),
            }),
            {
              optimisticUpdate() {
                return {};
              },
            },
          );
          await showToast({ style: Toast.Style.Success, title: "Cleared status" });
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed clearing status",
            message: error instanceof Error ? error.message : undefined,
          });
        }
      }}
    />
  );
}

function SetStatusWithAIAction(props: { statusText: string; mutate: MutatePromise<Profile | undefined> }) {
  const slack = useSlack();
  return (
    <Action
      title="Set Status"
      icon={Icon.Stars}
      onAction={async () => {
        await showToast({ style: Toast.Style.Animated, title: "Searching emoji..." });
        try {
          const answer = await AI.ask(
            `What's a good emoji for this Slack status? 
            Slack status: ${props.statusText}. 
            Single emoji for Slack status:`,
            { creativity: "low" },
          );

          await showToast({ style: Toast.Style.Animated, title: "Setting status..." });

          const profile: Profile = {
            status_emoji: getCodeForEmoji(answer.trim()),
            status_text: props.statusText,
            status_expiration: 0,
          };

          await clearSearchBar();

          await props.mutate(
            slack.users.profile.set({
              profile: JSON.stringify(profile),
            }),
            {
              optimisticUpdate() {
                return profile;
              },
            },
          );
          await showToast({ style: Toast.Style.Success, title: "Set status" });
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed setting status",
            message: error instanceof Error ? error.message : undefined,
          });
        }
      }}
    />
  );
}

function SetStatusAction(props: { preset: SlackStatusPreset; mutate: MutatePromise<Profile | undefined> }) {
  const slack = useSlack();
  return (
    <Action
      title="Set Status"
      icon={Icon.Pencil}
      onAction={async () => {
        await showToast({ style: Toast.Style.Animated, title: "Setting status..." });
        try {
          let expiration = 0;
          if (props.preset.defaultDuration > 0) {
            const expirationDate = new Date();
            expirationDate.setMinutes(expirationDate.getMinutes() + props.preset.defaultDuration);
            expiration = Math.floor(expirationDate.getTime() / 1000);
          }

          const profile: Profile = {
            status_emoji: props.preset.emojiCode,
            status_text: props.preset.title,
            status_expiration: expiration,
          };

          await props.mutate(
            slack.users.profile.set({
              profile: JSON.stringify(profile),
            }),
            {
              optimisticUpdate() {
                return profile;
              },
            },
          );
          await showToast({ style: Toast.Style.Success, title: "Set status" });
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed setting status",
            message: error instanceof Error ? error.message : undefined,
          });
        }
      }}
    />
  );
}

function SetStatusWithDuration(props: { preset: SlackStatusPreset; mutate: MutatePromise<Profile | undefined> }) {
  const slack = useSlack();

  const titleDurationPairs: [string, number][] = [
    ["Don't clear", 0],
    ["15 minutes", 15],
    ["30 minutes", 30],
    ["45 minutes", 45],
    ["1 hour", 60],
    ["1.5 hours", 90],
    ["2 hours", 120],
    ["3 hours", 180],
  ];

  return (
    <ActionPanel.Submenu icon={Icon.Clock} title="Set Status with Duration...">
      {titleDurationPairs.map(([title, duration]) => {
        return (
          <Action
            key={`${title}-${duration}`}
            title={title}
            icon={Icon.Clock}
            onAction={async () => {
              await showToast({ style: Toast.Style.Animated, title: "Setting status..." });
              try {
                let expiration = 0;
                if (duration > 0) {
                  const expirationDate = new Date();
                  expirationDate.setMinutes(expirationDate.getMinutes() + duration);
                  expiration = Math.floor(expirationDate.getTime() / 1000);
                }

                const profile: Profile = {
                  status_emoji: props.preset.emojiCode,
                  status_text: props.preset.title,
                  status_expiration: expiration,
                };

                await props.mutate(
                  slack.users.profile.set({
                    profile: JSON.stringify(profile),
                  }),
                  {
                    optimisticUpdate() {
                      return profile;
                    },
                  },
                );
                await showToast({ style: Toast.Style.Success, title: "Set status" });
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed setting status",
                  message: error instanceof Error ? error.message : undefined,
                });
              }
            }}
          />
        );
      })}
    </ActionPanel.Submenu>
  );
}

function StatusList() {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, data, mutate } = useSlackProfile();
  const [presets] = usePresets();

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} filtering>
      <List.EmptyView
        icon={Icon.Stars}
        title={searchText ? `Set status to '${searchText}'` : undefined}
        description="AI picks the best emoji for your status"
        actions={
          <ActionPanel>{searchText && <SetStatusWithAIAction statusText={searchText} mutate={mutate} />}</ActionPanel>
        }
      />
      <List.Section title="Current Status">
        <List.Item
          key="current-status"
          icon={getStatusIcon(data)}
          title={getStatusTitle(data)}
          subtitle={getStatusSubtitle(data)}
          actions={<ActionPanel>{data?.status_text && <ClearStatusAction mutate={mutate} />}</ActionPanel>}
        />
      </List.Section>
      <List.Section title="Presets">
        {presets.map((preset) => (
          <List.Item
            key={JSON.stringify(preset)}
            icon={getEmojiForCode(preset.emojiCode)}
            title={preset.title}
            subtitle={durationToString(preset.defaultDuration)}
            actions={
              <ActionPanel>
                <SetStatusAction preset={preset} mutate={mutate} />
                <SetStatusWithDuration preset={preset} mutate={mutate} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export default withOAuthSession(StatusList, slackOAuthConfig);
