import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { SlackClient, useMe } from "./shared/client";
import { withSlackClient } from "./shared/withSlackClient";
import { Action, ActionPanel, closeMainWindow, Icon, LaunchProps, List, popToRoot } from "@raycast/api";
import { SLACK_EMOJI_CODE_MAP } from "./constants/emoji.constants";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { type SlackStatusForm, StatusForm } from "./components/set-status/status-form.component";
import { EmojiPicker } from "./components/set-status/emoji-picker.component";
import { getDurationOptionFromTimestamp, getTextForExpiration } from "./utils/set-status/expiration.util";
import { showToastWithPromise } from "./utils/toast.util";
import SetAiStatusForm from "./components/set-status/set-ai-status-form.component";

// Reverse of SLACK_EMOJI_CODE_MAP: raw emoji glyph -> `:name:`. Raycast's argument field attaches an
// emoji auto-picker that inserts a raw Unicode glyph (e.g. 👈) rather than its name, so we map it back.
// The variation-selector-stripped key is added as a fallback so e.g. both `☝️` and `☝` resolve.
const EMOJI_NAME_BY_CHAR: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [name, char] of Object.entries(SLACK_EMOJI_CODE_MAP)) {
    if (!(char in map)) map[char] = name;
    const stripped = char.replace(/️/g, "");
    if (!(stripped in map)) map[stripped] = name;
  }
  return map;
})();

// Slack stores status emoji in `:name:` form. Accept `rocket`/`:rocket:` text or a raw emoji glyph
// (👈) from a deep link argument; the latter must be mapped back to its name or Slack rejects it.
function normalizeEmoji(emoji?: string): string | undefined {
  const trimmed = emoji?.trim();
  if (!trimmed) {
    return undefined;
  }

  // ASCII input is already a Slack emoji name (with or without colons) — just normalize the colons.
  if (/^[\x20-\x7E]+$/.test(trimmed)) {
    return `:${trimmed.replace(/^:+|:+$/g, "")}:`;
  }

  // Otherwise it's a raw Unicode glyph; map it to its `:name:`, falling back to the FE0F-stripped form.
  return EMOJI_NAME_BY_CHAR[trimmed] ?? EMOJI_NAME_BY_CHAR[trimmed.replace(/️/g, "")];
}

function SlackStatusList(props: LaunchProps<{ arguments: Arguments.SetStatus }>) {
  const { statusText: statusTextArgument, emoji: emojiArgument } = props.arguments;

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

  // Gate on whether arguments were *passed*, not on whether the emoji resolves — an emoji we can't
  // map still needs to reach the effect so it can report the failure instead of silently no-op-ing.
  const hasEmojiArgument = Boolean(emojiArgument?.trim());
  const hasLaunchArguments = Boolean(statusTextArgument?.trim() || hasEmojiArgument);
  const didAutoSetStatus = useRef(false);

  useEffect(() => {
    // When launched via deep link or a Quicklink with arguments, set the status directly and close.
    if (!hasLaunchArguments || didAutoSetStatus.current || isFetchMeLoading || isFetchProfileLoading) {
      return;
    }

    const statusText = statusTextArgument?.trim() || undefined;
    const emoji = normalizeEmoji(emojiArgument);

    // The emoji was provided but couldn't be mapped to a Slack `:name:` (e.g. a composite/ZWJ glyph
    // absent from SLACK_EMOJI_CODE_MAP). Surface it rather than silently dropping the launch.
    if (hasEmojiArgument && emoji === undefined) {
      didAutoSetStatus.current = true;
      showFailureToast(new Error(`"${emojiArgument?.trim()}" isn't a recognized Slack emoji.`), {
        title: "Failed to set status",
      });
      return;
    }

    // Preserving the field that wasn't passed relies on the current profile. If it failed to
    // load, setting only one field would clear the other, so bail with feedback instead.
    if ((statusText === undefined || emoji === undefined) && !profile) {
      didAutoSetStatus.current = true;
      showFailureToast(new Error("Couldn't load your current Slack status."), { title: "Failed to set status" });
      return;
    }

    didAutoSetStatus.current = true;

    showToastWithPromise(
      async () => {
        await SlackClient.setStatus({
          statusText,
          emoji,
          expiration: 0,
          originProfile: profile,
        });
        await mutate();
        await popToRoot();
        await closeMainWindow();
      },
      {
        loading: "The status is changing...",
        error: "An error occurred while changing the state.",
        success: () => ({
          title: "Set status",
          message: [emoji, statusText].filter(Boolean).join(" "),
        }),
      },
    );
  }, [
    hasLaunchArguments,
    hasEmojiArgument,
    isFetchMeLoading,
    isFetchProfileLoading,
    profile,
    mutate,
    statusTextArgument,
    emojiArgument,
  ]);

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
