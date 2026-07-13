import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { writeFileSync } from "fs";
import { basename, extname, dirname, join } from "path";
import { useState } from "react";
import { DEFAULT_MCP_PORT, SUPPORTED_FILE_EXTENSIONS } from "./lib/constants";
import { transcribeFile, TranscribeArgs } from "./lib/mcp-client";

type Format = NonNullable<TranscribeArgs["format"]>;

const FORMATS: Array<{ value: Format; label: string; ext: string }> = [
  { value: "text", label: "Plain Text", ext: "txt" },
  { value: "markdown", label: "Markdown", ext: "md" },
  { value: "srt", label: "SubRip (.srt)", ext: "srt" },
  { value: "vtt", label: "WebVTT (.vtt)", ext: "vtt" },
  { value: "json", label: "JSON", ext: "json" },
];

interface FormValues {
  file: string[];
  format: Format;
  speakers: boolean;
}

function getMcpPort(): number {
  const { mcpPort } = getPreferenceValues<Preferences>();
  const parsed = Number(mcpPort);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MCP_PORT;
}

function ResultView({
  result,
  format,
  sourcePath,
}: {
  result: string;
  format: Format;
  sourcePath: string;
}) {
  const ext = FORMATS.find((f) => f.value === format)?.ext ?? "txt";
  const sourceBase = basename(sourcePath, extname(sourcePath));
  const suggestedPath = join(dirname(sourcePath), `${sourceBase}.${ext}`);

  const markdown =
    format === "markdown"
      ? result
      : `\`\`\`${format === "json" ? "json" : ""}\n${result}\n\`\`\``;

  async function saveToFile() {
    try {
      writeFileSync(suggestedPath, result, "utf-8");
      await showToast({
        style: Toast.Style.Success,
        title: "Saved",
        message: suggestedPath,
      });
    } catch (err) {
      await showFailureToast(err, { title: "Could not save" });
    }
  }

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Transcription · ${basename(sourcePath)}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={result} />
          <Action
            title={`Save Next to Source (${ext.toUpperCase()})`}
            icon={Icon.SaveDocument}
            onAction={saveToFile}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Action.ShowInFinder title="Reveal Source" path={sourcePath} />
        </ActionPanel>
      }
    />
  );
}

export default function TranscribeFileCommand() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    const filePath = values.file?.[0];
    if (!filePath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No file selected",
      });
      return;
    }
    const ext = extname(filePath).replace(/^\./, "").toLowerCase();
    if (
      !SUPPORTED_FILE_EXTENSIONS.includes(
        ext as (typeof SUPPORTED_FILE_EXTENSIONS)[number],
      )
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unsupported file type",
        message: `Spokenly supports: ${SUPPORTED_FILE_EXTENSIONS.join(", ")}`,
      });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Transcribing…",
      message: basename(filePath),
    });

    try {
      const result = await transcribeFile(
        {
          file_path: filePath,
          format: values.format,
          speakers: values.speakers,
        },
        getMcpPort(),
      );
      toast.style = Toast.Style.Success;
      toast.title = "Done";
      toast.message = undefined;
      push(
        <ResultView
          result={result}
          format={values.format}
          sourcePath={filePath}
        />,
      );
    } catch (err) {
      toast.hide();
      await showFailureToast(err, { title: "Transcription failed" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Transcribe"
            icon={Icon.Waveform}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="Audio or Video File"
        allowMultipleSelection={false}
        info={`Supported: ${SUPPORTED_FILE_EXTENSIONS.join(", ")}`}
      />
      <Form.Dropdown id="format" title="Output Format" defaultValue="text">
        {FORMATS.map((f) => (
          <Form.Dropdown.Item key={f.value} value={f.value} title={f.label} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        id="speakers"
        label="Detect speakers"
        defaultValue={false}
        info="Enable speaker diarization when supported by the model"
      />
    </Form>
  );
}
