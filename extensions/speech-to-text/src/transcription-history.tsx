import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  showToast,
  Color,
  Clipboard,
  Alert,
  confirmAlert,
  trash,
  showInFinder,
  useNavigation,
  Form,
  getPreferenceValues,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fs from "fs-extra";
import path from "path";
import { exec } from "child_process";
import { listAudioFiles, getAudioDuration } from "./utils/audio";
import { saveTranscription, transcribeAudio, loadTranscription } from "./utils/ai/transcription";
import { formatDate, formatDuration, formatFileSize } from "./utils/formatting";
import { TranscriptionFile, TranscriptionResult, TranscriptionModelId } from "./types";
import { LANGUAGE_OPTIONS, TRANSCRIPTION_MODELS, buildCompletePrompt } from "./constants";

export default function TranscriptionHistory() {
  const { push } = useNavigation();
  const [files, setFiles] = useState<TranscriptionFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [isShowingDetails, setIsShowingDetails] = useState(true);

  const parseRecordingDate = (fileName: string): Date => {
    const regex = /recording-(.+)\.wav$/;
    const dateMatch = regex.exec(fileName);
    const dateStr = dateMatch
      ? dateMatch[1].replace(/-/g, (match, offset) => {
          if (offset === 10) return "T"; // After date
          if (offset > 10) return offset === 13 || offset === 16 ? ":" : "."; // Time separators
          return "-"; // Date separators
        })
      : "";

    if (!dateStr) throw new Error(`Invalid recording date format in filename: ${fileName}`);
    return new Date(dateStr);
  };

  const loadTranscriptionFromFile = async (filePath: string): Promise<string | null> => {
    const transcriptionFilePath = filePath.replace(/\.wav$/, ".json");

    if (await fs.pathExists(transcriptionFilePath)) {
      try {
        const transcriptionData = await fs.readJSON(transcriptionFilePath);
        return transcriptionData.text || null;
      } catch (error) {
        console.error(`Error reading transcription file ${transcriptionFilePath}:`, error);
      }
    }

    return null;
  };

  const processAudioFile = async (filePath: string): Promise<TranscriptionFile | null> => {
    try {
      const stats = await fs.stat(filePath);
      const fileName = path.basename(filePath);

      const recordedAt = parseRecordingDate(fileName);

      const duration = await getAudioDuration(filePath);

      const transcription = await loadTranscriptionFromFile(filePath);

      return {
        id: fileName,
        filePath,
        fileName,
        recordedAt,
        duration,
        sizeInBytes: stats.size,
        transcription,
        wordCount: transcription ? transcription.split(/\s+/).filter(Boolean).length : 0,
      };
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
      return null;
    }
  };

  const loadFiles = async () => {
    setIsLoading(true);

    try {
      const audioFiles = await listAudioFiles();
      const transcriptionFiles: TranscriptionFile[] = [];

      for (const filePath of audioFiles) {
        const file = await processAudioFile(filePath);
        if (file) {
          transcriptionFiles.push(file);
        }
      }

      transcriptionFiles.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());

      setFiles(transcriptionFiles);
    } catch (error) {
      console.error("Error loading audio files:", error);
      await showFailureToast(error, {
        title: "Failed to Load Files",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const copyTranscription = async (text: string) => {
    await Clipboard.copy(text);
    await showToast({
      style: Toast.Style.Success,
      title: "Transcription Copied",
      message: "Text copied to clipboard",
    });
  };

  const performTranscription = async (file: TranscriptionFile, transcriptionData: TranscriptionResult | null) => {
    await showToast({
      style: Toast.Style.Animated,
      title: "Transcribing...",
      message: file.fileName,
    });

    const result = await transcribeAudio(file.filePath, {
      overrideLanguage: transcriptionData?.language,
      overridePrompt: transcriptionData?.prompt,
      overrideModel: transcriptionData?.model,
    });

    await saveTranscription(file.filePath, result);

    setFiles((prevFiles) =>
      prevFiles.map((f) =>
        f.id === file.id
          ? { ...f, transcription: result.text, wordCount: result.text.split(/\s+/).filter(Boolean).length }
          : f,
      ),
    );

    await copyTranscription(result.text);
  };

  const handleTranscribe = async (file: TranscriptionFile) => {
    try {
      const existingTranscription = await loadTranscription(file.filePath);
      let useOriginalSettings = true;

      if (existingTranscription) {
        useOriginalSettings = await confirmAlert({
          title: "Re-transcribe Audio",
          message: "Do you want to use the original settings or modify them?",
          primaryAction: {
            title: "Use Original Settings",
          },
          dismissAction: {
            title: "Modify Settings",
          },
        });
      }

      if (useOriginalSettings) {
        await performTranscription(file, existingTranscription);
      } else {
        push(
          <TranscriptionSettingsForm
            file={file}
            existingTranscription={existingTranscription}
            onTranscribe={performTranscription}
          />,
        );
      }
    } catch (error) {
      console.error("Transcription error:", error);

      await showFailureToast(error, {
        title: "Transcription Failed",
      });
    }
  };

  const handleDeleteFile = async (file: TranscriptionFile) => {
    const shouldDelete = await confirmAlert({
      title: "Delete Recording",
      message: `Are you sure you want to delete "${file.fileName}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!shouldDelete) return;

    try {
      await trash(file.filePath);

      const transcriptionFilePath = file.filePath.replace(/\.wav$/, ".json");
      if (await fs.pathExists(transcriptionFilePath)) {
        await trash(transcriptionFilePath);
      }

      setFiles((prevFiles) => prevFiles.filter((f) => f.id !== file.id));

      await showToast({
        style: Toast.Style.Success,
        title: "Recording Deleted",
        message: file.fileName,
      });
    } catch (error) {
      console.error("Error deleting file:", error);

      await showFailureToast(error, {
        title: "Delete Failed",
      });
    }
  };

  const filteredFiles = files.filter((file) => {
    if (!searchText) return true;

    const searchLower = searchText.toLowerCase();
    return file.fileName.toLowerCase().includes(searchLower) || file.transcription?.toLowerCase().includes(searchLower);
  });

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search recordings and transcriptions..."
      throttle
      isShowingDetail={isShowingDetails}
    >
      <List.Section title="Recordings" subtitle={filteredFiles.length.toString()}>
        {filteredFiles.map((file) => (
          <List.Item
            key={file.id}
            title={formatDate(file.recordedAt)}
            accessories={[
              { text: formatDuration(file.duration) },
              { text: formatFileSize(file.sizeInBytes) },
              {
                tag: {
                  value: file.transcription ? "Transcribed" : "Audio Only",
                  color: file.transcription ? Color.Green : Color.Orange,
                },
              },
            ]}
            detail={
              <List.Item.Detail
                markdown={
                  file.transcription
                    ? `# Transcription:\n\n${file.transcription}`
                    : "# No Transcription\n\nThis recording hasn't been transcribed yet. Use the Transcribe action (⌘T) to generate a transcription."
                }
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="File Name">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={file.fileName}
                        icon={{ source: Icon.Document, tintColor: Color.PrimaryText }}
                        onAction={() => {
                          showInFinder(file.filePath);
                        }}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Recorded On"
                      text={formatDate(file.recordedAt)}
                      icon={{ source: Icon.Calendar, tintColor: Color.PrimaryText }}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Duration"
                      text={formatDuration(file.duration)}
                      icon={{ source: Icon.Clock, tintColor: Color.PrimaryText }}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="File Size"
                      text={formatFileSize(file.sizeInBytes)}
                      icon={{ source: Icon.Document, tintColor: Color.PrimaryText }}
                    />
                    {file.transcription && (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Word Count"
                          text={file.wordCount.toString()}
                          icon={{ source: Icon.Document, tintColor: Color.PrimaryText }}
                        />
                      </>
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title={isShowingDetails ? "Hide Details" : "Show Details"}
                  icon={isShowingDetails ? Icon.Sidebar : Icon.ChevronRight}
                  onAction={() => setIsShowingDetails(!isShowingDetails)}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
                {!file.transcription && (
                  <Action
                    title={"Transcribe"}
                    icon={Icon.Text}
                    onAction={() => handleTranscribe(file)}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                )}
                {file.transcription && (
                  <ActionPanel.Section title="Transcription Actions">
                    <Action
                      title={"Re-transcribe"}
                      icon={Icon.ArrowClockwise}
                      onAction={() => handleTranscribe(file)}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                    />
                    <Action
                      title="Copy Transcription"
                      icon={Icon.Clipboard}
                      onAction={() => copyTranscription(file.transcription!)}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel.Section>
                )}
                <ActionPanel.Section title="File Actions">
                  <Action
                    title="Refresh List"
                    icon={Icon.RotateClockwise}
                    onAction={loadFiles}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title="Open Folder"
                    icon={Icon.Folder}
                    onAction={() => {
                      const folder = path.dirname(file.filePath);
                      exec(`open "${folder}"`);
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action
                    title="Delete Recording"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteFile(file)}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function TranscriptionSettingsForm({
  file,
  existingTranscription,
  onTranscribe,
}: {
  file: TranscriptionFile;
  existingTranscription: TranscriptionResult | null;
  onTranscribe: (file: TranscriptionFile, transcription: TranscriptionResult | null) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();

  const [language, setLanguage] = useState<string>(existingTranscription?.language ?? preferences.language ?? "auto");
  const [promptText, setPromptText] = useState<string>(existingTranscription?.prompt ?? preferences.promptText ?? "");
  const [model, setModel] = useState<TranscriptionModelId>(existingTranscription?.model ?? preferences.model);

  const handleSubmit = async () => {
    const prompt = existingTranscription?.prompt ?? buildCompletePrompt(promptText, preferences.userTerms);

    const modifiedTranscription: TranscriptionResult = {
      ...(existingTranscription || {}),
      text: existingTranscription?.text ?? "",
      timestamp: existingTranscription?.timestamp ?? new Date().toISOString(),
      language,
      prompt,
      model,
    };

    pop();

    await onTranscribe(file, modifiedTranscription);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Transcribe" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={pop} shortcut={{ modifiers: ["cmd"], key: "escape" }} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="model"
        title="Model"
        value={model}
        onChange={(newValue) => setModel(newValue as TranscriptionModelId)}
        info="Select the AI model to use for transcription"
      >
        {TRANSCRIPTION_MODELS.map((model) => (
          <Form.Dropdown.Item key={model.id} value={model.id} title={model.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="language" title="Language" value={language} onChange={setLanguage}>
        {LANGUAGE_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      <Form.TextArea
        id="promptText"
        title="Prompt"
        placeholder="Custom instructions to guide the AI transcription"
        value={promptText}
        onChange={setPromptText}
        info="Instructions for how the AI should approach the transcription"
      />
    </Form>
  );
}
