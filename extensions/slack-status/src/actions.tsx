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
import { Profile } from "@slack/web-api/dist/response/UsersProfileGetResponse";
import { durationTitleMap } from "./durations";
import { getEmojiForCode } from "./emojis";
import { StatusForm } from "./form";
import { useSlack } from "./slack";
import { SlackStatusPreset, SlackMutatePromise } from "./types";
import { setStatusToPreset, setStatusToValues, showToastWithPromise } from "./utils";
import { nanoid } from "nanoid";

// Status Actions

export function ClearStatusAction(props: { mutate: SlackMutatePromise }) {
  const slack = useSlack();
  return (
    <Action
      title="Clear Status"
      icon={Icon.XMarkCircle}
      onAction={async () => {
        const blankProfile = {
          status_text: "",
          status_expiration: 0,
          status_emoji: "",
        };

        const promises = Promise.all([
          slack.users.profile.set({
            profile: JSON.stringify(blankProfile),
          }),
          slack.dnd.endSnooze(),
        ]);

        await showToastWithPromise(
          props.mutate(promises, {
            optimisticUpdate() {
              return {
                profile: blankProfile,
                dnd: undefined,
              };
            },
          }),
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

export function SetStatusWithAIAction(props: { statusText: string; mutate: SlackMutatePromise }) {
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
              
              **Respond with a JSON object with the following attributes:**
              - "text": a string value for status text, should be short and sweet, with no punctuation, e.g. "Working out", "Listening to Drake's new album", "Coffee break". It should not include the status duration for example "Working out" instead of "Working out for 2 hours" or "Working out until tomorrow".
              - "emoji": a Slack-compatible string for single emoji matching the text of the status. Emojis should be in the form: :<emoji identifier>:

              **If the user has specified a time or the end of status in their description then add the following attribute:**
              - "duration": an integer representing the duration of the status in seconds

              Rules:
              - Response should be a string without any template quotes for formatting.
              - all strings should use double quotation marks and should have .trim() applied
              - all emojis should be in form :<emoji identifier>:
              - all attributes should be wrapped with double quotation marks
              - all spaces and carriage returns should be removed from the resulting string

              Current time of user's status: ${new Date().toLocaleTimeString()}. User's description of their status: ${
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
              status_emoji: getEmojiForCode(parsedAnswer.emoji),
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
                  return {
                    profile,
                    dnd: undefined,
                  };
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

export function SetStatusAction(props: { preset: SlackStatusPreset; mutate: SlackMutatePromise }) {
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

export function SetStatusWithDuration(props: { preset: SlackStatusPreset; mutate: SlackMutatePromise }) {
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
              const parsedDuration = parseInt(duration);

              showToastWithPromise(
                async () => {
                  await setStatusToValues({
                    slack: slack,
                    mutate: props.mutate,
                    duration: parsedDuration,
                    emojiCode: props.preset.emojiCode,
                    statusText: props.preset.title,
                    pauseNotifications: props.preset.pauseNotifications,
                  });
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

export function SetCustomStatusAction(props: { mutate: SlackMutatePromise }) {
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

                await setStatusToValues({
                  slack: slack,
                  mutate: props.mutate,
                  duration: duration,
                  emojiCode: values.emoji,
                  statusText: values.statusText,
                  pauseNotifications: values.pauseNotifications,
                });

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
              pauseNotifications: values.pauseNotifications,
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
          initialValues={{
            emoji: props.preset.emojiCode,
            statusText: props.preset.title,
            duration: props.preset.defaultDuration.toString(),
            pauseNotifications: props.preset.pauseNotifications,
          }}
          onSubmit={async (values) => {
            props.onEdit({
              title: values.statusText,
              emojiCode: values.emoji,
              defaultDuration: parseInt(values.duration),
              pauseNotifications: values.pauseNotifications,
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
