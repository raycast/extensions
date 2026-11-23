import {
  Action,
  ActionPanel,
  AI,
  Alert,
  confirmAlert,
  Detail,
  environment,
  Form,
  Icon,
  Keyboard,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { LanguageDropdown } from "./components/TranscriptionOptionFields";
import { selectedFinderFiles } from "./lib/files";
import { errorMessage, transcribeFile } from "./lib/mw";
import { languageSuffix, translateSubtitles } from "./lib/subtitles";

type SubtitleFormat = "srt" | "vtt";

type FormValues = {
  file: string[];
  targetLanguage: string;
  format: SubtitleFormat;
  language: string;
};

type Result = {
  source: string;
  format: SubtitleFormat;
  targetLanguage: string;
  subtitles: string;
};

function outputPath(result: Result): string {
  const name = basename(result.source, extname(result.source));
  return join(dirname(result.source), `${name}.${languageSuffix(result.targetLanguage)}.${result.format}`);
}

async function save(result: Result) {
  const target = outputPath(result);
  if (existsSync(target)) {
    const confirmed = await confirmAlert({
      title: "Overwrite existing subtitles?",
      message: target,
      primaryAction: { title: "Overwrite", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
  }
  try {
    await writeFile(target, result.subtitles, "utf8");
    await showToast({
      style: Toast.Style.Success,
      title: "Subtitles saved",
      message: basename(target),
      primaryAction: { title: "Show in Finder", onAction: () => open(dirname(target)) },
    });
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Could not save subtitles", message: errorMessage(error) });
  }
}

function TranslatedSubtitles({ result }: { result: Result }) {
  return (
    <Detail
      navigationTitle={basename(outputPath(result))}
      markdown={`\`\`\`${result.format}\n${result.subtitles}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action
            title="Save Next to Source File"
            icon={Icon.SaveDocument}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={() => save(result)}
          />
          <Action.CopyToClipboard title="Copy Subtitles" content={result.subtitles} />
          <Action.ShowInFinder path={result.source} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();
  const { data: selection, isLoading } = usePromise(selectedFinderFiles);

  if (!environment.canAccess(AI)) {
    return <Detail markdown="# Raycast AI is not available\n\nTranslating subtitles needs Raycast Pro." />;
  }

  async function handleSubmit(values: FormValues) {
    const source = values.file[0];
    const targetLanguage = values.targetLanguage.trim();
    if (!source || !targetLanguage) {
      await showToast({ style: Toast.Style.Failure, title: "Pick a file and a target language" });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Transcribing…", message: basename(source) });
    try {
      const original = await transcribeFile(source, {
        format: values.format,
        style: "subtitles",
        language: values.language,
      });
      toast.title = `Translating into ${targetLanguage}…`;
      const subtitles = await translateSubtitles(original, targetLanguage, (done, total) => {
        toast.message = total > 1 ? `Part ${Math.min(done + 1, total)} of ${total}` : undefined;
      });
      toast.style = Toast.Style.Success;
      toast.title = "Subtitles translated";
      toast.message = undefined;
      push(<TranslatedSubtitles result={{ source, format: values.format, targetLanguage, subtitles }} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Translation failed";
      toast.message = errorMessage(error);
    }
  }

  if (isLoading) return <Form isLoading />;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Translate Subtitles" icon={Icon.Globe} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="Video or Audio"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        defaultValue={selection?.slice(0, 1) ?? []}
      />
      <Form.TextField id="targetLanguage" title="Translate Into" placeholder="French" storeValue />
      <Form.Dropdown id="format" title="Format" defaultValue="srt" storeValue>
        <Form.Dropdown.Item value="srt" title="SubRip (.srt)" />
        <Form.Dropdown.Item value="vtt" title="WebVTT (.vtt)" />
      </Form.Dropdown>
      <Form.Separator />
      <LanguageDropdown title="Spoken Language" />
      <Form.Description text="Timecodes come from MacWhisper; only the text is sent to Raycast AI." />
    </Form>
  );
}
