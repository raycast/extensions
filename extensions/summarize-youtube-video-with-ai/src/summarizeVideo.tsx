import {
  getPreferenceValues,
  launchCommand,
  LaunchProps,
  LaunchType,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";

interface SummarizeVideoWithProps {
  video: string;
}

export type Preferences = {
  chosenAi: "anthropic" | "openai" | "raycastai";
  creativity: "0" | "0.5" | "1" | "1.5" | "2";
  openaiApiToken: string;
  anthropicApiToken: string;
  language: string;
  openaiEndpoint: string;
  openaiModel: string;
  anthropicModel: string;
};

export default function DeprecationNote(
  props: LaunchProps<{
    arguments: SummarizeVideoWithProps;
  }>,
) {
  const preferences = getPreferenceValues() as Preferences;
  const { chosenAi } = preferences;

  switch (chosenAi) {
    case "anthropic":
      showToast({
        style: Toast.Style.Failure,
        title: "Command has changed",
        message: "Please run `Summarize YouTube Video with Anthropic` and enter your anthropic API key in preferences",
        primaryAction: {
          title: "Open Exetension Settings",
          onAction: () => openExtensionPreferences(),
        },
      });
      launchCommand({ name: "summarizeVideoWithAnthropic", type: LaunchType.UserInitiated, context: { props } });
      break;
    case "openai":
      showToast({
        style: Toast.Style.Failure,
        title: "Command has changed",
        message: "Please run `Summarize YouTube Video with OpenAI` and enter your OpenAI API in preferences",
        primaryAction: {
          title: "Open Exetension Settings",
          onAction: () => openExtensionPreferences(),
        },
      });
      launchCommand({ name: "summarizeVideoWithOpenAI", type: LaunchType.UserInitiated, context: { props } });
      break;
    case "raycastai":
      launchCommand({
        name: "Please run `Summarize YouTube Video with Raycast`.",
        type: LaunchType.UserInitiated,
        context: { video: props.arguments.video },
      });
      break;
    default:
      showToast({
        style: Toast.Style.Failure,
        title: "⚠️",
        message: "Please choose another command",
        primaryAction: {
          title: "Open Exetension Settings",
          onAction: () => openExtensionPreferences(),
        },
      });
      return;
  }
  return null;
}
