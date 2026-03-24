import { useCachedPromise } from "@raycast/utils";
import { SlackClient, useMe } from "./shared/client";
import { withSlackClient } from "./shared/withSlackClient";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { SLACK_EMOJI_CODE_MAP } from "./constants/emoji.constants";
import { useCallback, useMemo } from "react";
import { type SlackStatusForm, StatusForm } from "./components/set-status/status-form.component";
import { EmojiPicker } from "./components/set-status/emoji-picker.component";
import { getDurationOptionFromTimestamp, getTextForExpiration } from "./utils/set-status/expiration.util";
import { showToastWithPromise } from "./utils/toast.util";
import SetAiStatusForm from "./components/set-status/set-ai-status-form.component";

function SlackStatusList() {
  const { data: me, isLoading: isFetchMeLoading } = useMe();
  const {
    data: profile,
    isLoading: isFetchProfileLoading,
    mutate,
  } = useCachedPromise(
    async (userId?: string) => {
      if (!userId) {
        throw new Error("[getUserProfileById] UserId required");
      }

      return SlackClient.getUserProfileById(userId);
    },
    me?.id ? [me?.id] : [undefined],
    {
      execute: !!me?.id,
    },
  );
  const { data: workspaceEmojis, isLoading: isFetchWorkspaceEmojisLoading } = useCachedPromise(
    SlackClient.getWorkspaceEmojis,
  );

  const isLoading = useMemo(() => {
    return isFetchProfileLoading || isFetchMeLoading || isFetchWorkspaceEmojisLoading;
  }, [isFetchProfileLoading, isFetchMeLoading, isFetchWorkspaceEmojisLoading]);

  const emojis: { [key: string]: string } = useMemo(() => {
    return {
      ...workspaceEmojis,
      ...SLACK_EMOJI_CODE_MAP,
    };
  }, [workspaceEmojis]);

  const currentStatusEmoji = useMemo(() => {
    if (!profile?.status_emoji) {
      return undefined;
    }

    return emojis[profile.status_emoji];
  }, [profile?.status_emoji, emojis]);

  const getCurrentStatusText = useCallback(
    (defaultStatusText?: string) => {
      const statusText = (profile?.status_text ?? "").trim();

      if (!statusText) {
        return defaultStatusText ?? "";
      }

      return statusText;
    },
    [profile?.status_text],
  );

  const getCurrentStatusEmojiName = useCallback(
    (defaultStatusEmojiName?: string) => {
      const emojiName = (profile?.status_emoji ?? "").trim();

      if (!emojiName) {
        return defaultStatusEmojiName ?? "";
      }

      return emojiName;
    },
    [profile?.status_emoji],
  );

  const currentStatusExpirationText = useMemo(() => {
    if (!profile?.status_expiration) {
      return undefined;
    }

    if (profile.status_expiration === 0) {
      return "Don't clear";
    }

    return getTextForExpiration(profile.status_expiration);
  }, [profile?.status_expiration]);

  const currentStatusExpiration = useMemo(() => {
    if (!profile?.status_expiration) {
      return 0;
    }

    return profile.status_expiration;
  }, [profile?.status_expiration]);

  const handeStatusChange = useCallback(
    async (form: Pick<SlackStatusForm, "statusText" | "emoji" | "expiration">) => {
      await showToastWithPromise(
        async () => {
          await SlackClient.setStatus({
            statusText: form.statusText,
            emoji: form.emoji,
            expiration: form.expiration,
            originProfile: profile,
          });

          await mutate();
        },
        {
          loading: "The status is changing...",
          error: "An error occurred while changing the state.",
          success: () => ({
            title: "Set status emoji, text",
            message: `${form.emoji} ${form.statusText}`,
          }),
        },
      );
    },
    [mutate, profile],
  );

  const handleEmojiChange = useCallback(
    async (emoji: { name: string; value: string }) => {
      await showToastWithPromise(
        async () => {
          await SlackClient.setStatus({
            emoji: emoji.name,
            originProfile: profile,
          });

          await mutate();
        },
        {
          loading: "The status emoji is changing...",
          error: "An error occurred while changing the state.",
          success: () => ({
            title: "Set status emoji",
            message: `${emoji.name}`,
          }),
        },
      );
    },
    [mutate, profile],
  );

  const clearStatus = useCallback(async () => {
    await showToastWithPromise(
      async () => {
        await SlackClient.setStatus({
          emoji: "",
          statusText: "",
          expiration: 0,
          originProfile: profile,
        });

        await mutate();
      },
      {
        loading: "The status emoji is changing...",
        error: "An error occurred while changing the state.",
        success: `The status has been removed.`,
      },
    );
  }, [mutate, profile]);

  return (
    <List isLoading={isLoading}>
      <List.Section title={"Current Status"}>
        <List.Item
          title={getCurrentStatusText("No Status Text")}
          icon={currentStatusEmoji}
          subtitle={currentStatusExpirationText}
        />
      </List.Section>

      <List.Section title={"Actions"}>
        <List.Item
          title={"Set New Status"}
          icon={"✏️"}
          actions={
            <ActionPanel>
              <Action.Push
                title={"Open Status Form"}
                target={
                  <StatusForm
                    emojis={emojis}
                    formInitialValues={{
                      statusText: getCurrentStatusText(),
                      emoji: getCurrentStatusEmojiName(),
                      duration: getDurationOptionFromTimestamp(currentStatusExpiration),
                      customUntil: currentStatusExpiration === 0 ? null : new Date(currentStatusExpiration * 1000),
                      expiration: currentStatusExpiration,
                    }}
                    onSubmit={handeStatusChange}
                  />
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title={"Set Status Emoji"}
          icon={"😁"}
          actions={
            <ActionPanel>
              <Action.Push
                title={"Choose Emoji"}
                target={<EmojiPicker emojis={emojis} onSelect={handleEmojiChange} />}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title={"Set Status with AI"}
          icon={Icon.Stars}
          actions={
            <ActionPanel>
              <Action.Push title={"Set Status with AI"} target={<SetAiStatusForm onSubmit={handeStatusChange} />} />
            </ActionPanel>
          }
        />

        <List.Item
          title={"Clear Status"}
          icon={"🗑️"}
          actions={
            <ActionPanel>
              <Action title={"Clear Status"} style={Action.Style.Destructive} onAction={clearStatus} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

export default withSlackClient(SlackStatusList);
