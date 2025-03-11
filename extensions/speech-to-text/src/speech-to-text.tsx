import { useState, useEffect } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Clipboard,
  showToast,
  Toast,
  open,
  getPreferenceValues,
  getSelectedText,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { transcribeAudio } from "./utils/ai/transcription";
import { useAudioRecorder } from "./hooks/useAudioRecorder";
import { Preferences } from "./types";
import { LANGUAGE_OPTIONS, TRANSCRIPTION_MODELS } from "./constants";

interface TranscriptFormValues {
  transcription: string;
  language: string;
  model: string;
  promptText: string;
  userTerms: string;
  useContext: boolean;
}

export default function Command() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const preferences = getPreferenceValues<Preferences>();

  const { isRecording, recordingDuration, error, startRecording, stopRecording } = useAudioRecorder();

  const { handleSubmit, itemProps, setValue, values } = useForm<TranscriptFormValues>({
    onSubmit: (values) => {
      Clipboard.copy(values.transcription);
      showToast({
        style: Toast.Style.Success,
        title: "Copied to clipboard",
      });
    },
    initialValues: {
      transcription: "",
      language: preferences.language ?? "",
      model: preferences.model,
      promptText: preferences.promptText ?? "",
      userTerms: preferences.userTerms ?? "",
      useContext: preferences.enableContext ?? true,
    },
  });

  const handleStopRecording = async () => {
    const recordingFilePath = await stopRecording();

    if (recordingFilePath) {
      try {
        setIsTranscribing(true);

        const languageTitle =
          values.language === "auto"
            ? "Auto-detect"
            : (LANGUAGE_OPTIONS.find((option) => option.value === values.language)?.title ?? "Auto-detect");

        await showToast({
          style: Toast.Style.Animated,
          title: "Transcribing...",
          message: `Language: ${languageTitle}`,
        });

        let selection = "";
        try {
          selection = await getSelectedText();
        } catch (error) {
          console.error("Error getting selected text:", error);
        }

        const result = await transcribeAudio(recordingFilePath, {
          overrideLanguage: values.language,
          overrideModel: values.model,
          promptOptions: {
            promptText: values.promptText,
            userTerms: values.userTerms,
            highlightedText: values.useContext ? selection : undefined,
          },
        });
        setValue("transcription", result.text);

        await Clipboard.copy(result.text);

        await showToast({
          style: Toast.Style.Success,
          title: "Transcription complete",
          message: "Text copied to clipboard",
        });
      } catch (error) {
        console.error("Transcription error:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Transcription failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsTranscribing(false);
      }
    }
  };

  const handleNewRecording = () => {
    setValue("transcription", "");
    startRecording();
  };

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error,
      });
    }
  }, [error]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getPlaceholder = () => {
    if (isRecording) {
      return `Recording in progress... (${formatDuration(recordingDuration)})`;
    }
    if (isTranscribing) {
      return "Transcribing your audio...";
    }
    return "Start recording with ⌘+R";
  };

  const getTitle = () => {
    if (isRecording) {
      return "Recording";
    }
    if (isTranscribing) {
      return "Transcribing";
    }
    return "Speech to Text";
  };

  return (
    <Form
      isLoading={isTranscribing}
      actions={
        <ActionPanel>
          {!isRecording && (
            <Action title="Start Recording" onAction={handleNewRecording} shortcut={{ modifiers: ["cmd"], key: "r" }} />
          )}

          {isRecording && (
            <Action title="Stop Recording" onAction={handleStopRecording} shortcut={{ modifiers: ["cmd"], key: "s" }} />
          )}

          <Action.SubmitForm
            title="Copy to Clipboard"
            onSubmit={handleSubmit}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />

          <Action title="New Recording" onAction={handleNewRecording} shortcut={{ modifiers: ["cmd"], key: "n" }} />

          <Action
            title="View History"
            onAction={() => open("raycast://extensions/facundo_prieto/speech-to-text/transcription-history")}
            shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        {...itemProps.transcription}
        title={getTitle()}
        placeholder={getPlaceholder()}
        enableMarkdown={false}
        autoFocus
      />

      <Form.Separator />

      <Form.TextArea
        {...itemProps.promptText}
        title="Prompt"
        placeholder="Custom instructions to guide the AI transcription"
        info="Instructions for how the AI should approach the transcription"
      />

      <Form.TextField
        {...itemProps.userTerms}
        title="Custom Terms"
        placeholder="React.js, TypeScript, GraphQL, John Doe"
        info="Comma-separated list of specialized terms, names, or jargon"
      />

      <Form.Checkbox
        {...itemProps.useContext}
        title="Use Highlighted Text"
        label={`Use highlighted text as context`}
        info="Uses any text you have highlighted in another app as context for transcription"
      />

      <Form.Dropdown
        {...itemProps.language}
        title="Language"
        info="Select a language for better transcription accuracy"
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown {...itemProps.model} title="Model" info="Select a model for better transcription accuracy">
        {TRANSCRIPTION_MODELS.map((model) => (
          <Form.Dropdown.Item key={model.id} value={model.id} title={model.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
