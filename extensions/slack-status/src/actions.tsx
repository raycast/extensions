import {
  AI,
  Action,
  ActionPanel,
  Alert,
  Icon,
  Keyboard,
  Toast,
  clearSearchBar,
  confirmAlert,
  environment,
  showToast,
  useNavigation,
} from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { Profile } from "@slack/web-api/dist/response/UsersProfileGetResponse";
import { durationTitleMap } from "./durations";
import { getCodeForEmoji, getEmojiForCode } from "./emojis";
import { StatusForm } from "./form";
import { useSlack } from "./slack";
import { SlackStatusPreset } from "./types";
import { setStatusToPreset, showToastWithPromise } from "./utils";
import { nanoid } from "nanoid";

// Status Actions

export function ClearStatusAction(props: { mutate: MutatePromise<Profile | undefined> }) {
  const slack = useSlack();
  return (
    <Action
      title="Clear Status"
      icon={Icon.XMarkCircle}
      onAction={async () => {
        await showToastWithPromise(
          props.mutate(
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
          ),
          {
            loading: "Clearing status...",
            success: "Cleared status",
            error: "Failed clearing status",
          },
        );
      }}
    />
  );
}

export function SetStatusWithAIAction(props: { statusText: string; mutate: MutatePromise<Profile | undefined> }) {
  const slack = useSlack();
  return (
    <Action
      title="Set Status"
      icon={Icon.Stars}
      onAction={async () => {
        showToastWithPromise(
          async () => {
            const answer = await AI.ask(
              `You help a Slack user set their status.
              
              Respond with the following JSON for the Slack status:
              {
                "text": <string for status text, should be short and sweet, no punctuation at the end, e.g. "Working out", "Listening to Drake's new album", "Coffe break">,
                "emoji": <string for single emoji matching the text of the status>,
                "duration": <optional integer for duration of status in seconds, only include if user specified duration or end of status in their description>
              }

              Current time of users status: ${new Date().toLocaleTimeString()}. User's description of their status: ${
                props.statusText
              }. 

              Your suggested Slack status:`,
              { creativity: "low" },
            );

            const parsedAnswer = JSON.parse(answer);

            if (typeof parsedAnswer.emoji !== "string" || typeof parsedAnswer.text !== "string") {
              throw new Error("AI generated invalid status 🤷");
            }

            const profile: Profile = {
              status_emoji: getCodeForEmoji(parsedAnswer.emoji),
              status_text: parsedAnswer.text,
              status_expiration:
                parsedAnswer.duration && typeof parsedAnswer.duration === "number"
                  ? new Date().getTime() / 1000 + parsedAnswer.duration
                  : 0,
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

            return parsedAnswer;
          },
          {
            loading: "Setting status with AI...",
            success: (value) => ({
              title: "Set status with AI",
              message: `${value.emoji} ${value.text}`,
            }),
            error: "Failed setting status with AI",
          },
        );
      }}
    />
  );
}

export function SetStatusAction(props: { preset: SlackStatusPreset; mutate: MutatePromise<Profile | undefined> }) {
  const slack = useSlack();
  return (
    <Action
      title="Set Status"
      icon={Icon.Pencil}
      onAction={async () => {
        setStatusToPreset({
          ...props,
          slack,
        });
      }}
    />
  );
}

export function SetStatusWithDuration(props: {
  preset: SlackStatusPreset;
  mutate: MutatePromise<Profile | undefined>;
}) {
  const slack = useSlack();

  return (
    <ActionPanel.Submenu icon={Icon.Clock} title="Set Status with Duration...">
      {Object.entries(durationTitleMap).map(([duration, title]) => {
        return (
          <Action
            key={`${title}-${duration}`}
            title={title}
            icon={Icon.Clock}
            onAction={async () => {
              showToastWithPromise(
                async () => {
                  const parsedDuration = parseInt(duration);

                  let expiration = 0;
                  if (parsedDuration > 0) {
                    const expirationDate = new Date();
                    expirationDate.setMinutes(expirationDate.getMinutes() + parsedDuration);
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
                },
                {
                  loading: "Setting status with duration...",
                  success: "Set status with duration",
                  error: "Failed setting status with duration",
                },
              );
            }}
          />
        );
      })}
    </ActionPanel.Submenu>
  );
}

export function SetCustomStatusAction(props: { mutate: MutatePromise<Profile | undefined> }) {
  const slack = useSlack();
  const { pop } = useNavigation();

  return (
    <Action.Push
      title="Set Custom Status"
      icon={Icon.Pencil}
      shortcut={Keyboard.Shortcut.Common.New}
      target={
        <StatusForm
          actionTitle="Set Custom Status"
          onSubmit={async (values) => {
            showToastWithPromise(
              async () => {
                const duration = parseInt(values.duration);

                let expiration = 0;
                if (duration > 0) {
                  const expirationDate = new Date();
                  expirationDate.setMinutes(expirationDate.getMinutes() + duration);
                  expiration = Math.floor(expirationDate.getTime() / 1000);
                }

                const profile: Profile = {
                  status_emoji: values.emoji,
                  status_text: values.statusText,
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

                pop();
              },
              {
                loading: "Setting custom status...",
                success: "Set custom status",
                error: "Failed setting custom status",
              },
            );
          }}
        />
      }
    />
  );
}

// Presets Actions

export function CreateStatusPresetAction(props: { onCreate: (preset: SlackStatusPreset) => void }) {
  const { pop } = useNavigation();

  return (
    <Action.Push
      title="Create Preset"
      icon={Icon.NewDocument}
      shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
      target={
        <StatusForm
          actionTitle="Create Preset"
          onSubmit={async (values) => {
            props.onCreate({
              title: values.statusText,
              emojiCode: values.emoji,
              defaultDuration: parseInt(values.duration),
              id: nanoid(),
            });

            pop();

            await showToast({
              style: Toast.Style.Success,
              title: "Created preset",
              message: `${getEmojiForCode(values.emoji)} ${values.statusText}`,
            });
          }}
        />
      }
    />
  );
}

function createLink(preset: SlackStatusPreset) {
  const protocol = environment.raycastVersion.includes("alpha") ? "raycastinternal://" : "raycast://";
  const contextPreset = encodeURIComponent(JSON.stringify({ presetId: preset.id }));
  return `${protocol}extensions/petr/${environment.extensionName}/setStatus?context=${contextPreset}`;
}

export function CreateQuicklinkPresetAction(props: { preset: SlackStatusPreset }) {
  const link = createLink(props.preset);

  return (
    <Action.CreateQuicklink
      title="Create Quicklink"
      quicklink={{ link: link, name: props.preset.title }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
    />
  );
}

export function CopyDeeplinkPresetAction(props: { preset: SlackStatusPreset }) {
  const link = createLink(props.preset);

  return (
    <Action.CopyToClipboard title="Copy Deeplink" content={link} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
  );
}

export function DeleteStatusPresetAction(props: { onDelete: () => void }) {
  return (
    <Action
      title="Delete Preset"
      icon={Icon.Trash}
      shortcut={Keyboard.Shortcut.Common.Remove}
      style={Action.Style.Destructive}
      onAction={async () => {
        const confirmed = await confirmAlert({
          icon: Icon.Trash,
          title: "Delete preset?",
          message: "Are you sure you want to delete this preset permanently?",
          rememberUserChoice: true,
          primaryAction: {
            title: "Confirm",
            style: Alert.ActionStyle.Destructive,
          },
        });

        if (!confirmed) {
          return;
        }

        props.onDelete();
        await showToast({ style: Toast.Style.Success, title: "Deleted preset" });
      }}
    />
  );
}

export function EditStatusPresetAction(props: {
  preset: SlackStatusPreset;
  onEdit: (editedPreset: SlackStatusPreset) => void;
}) {
  const { pop } = useNavigation();

  return (
    <Action.Push
      title="Edit Preset"
      icon={Icon.Pencil}
      shortcut={Keyboard.Shortcut.Common.Edit}
      target={
        <StatusForm
          actionTitle="Update Preset"
          initalValues={{
            emoji: props.preset.emojiCode,
            statusText: props.preset.title,
            duration: props.preset.defaultDuration.toString(),
          }}
          onSubmit={async (values) => {
            props.onEdit({
              title: values.statusText,
              emojiCode: values.emoji,
              defaultDuration: parseInt(values.duration),
              id: props.preset.id ?? nanoid(),
            });

            pop();

            await showToast({
              style: Toast.Style.Success,
              title: "Updated preset",
              message: `${getEmojiForCode(values.emoji)} ${values.statusText}`,
            });
          }}
        />
      }
    />
  );
}
