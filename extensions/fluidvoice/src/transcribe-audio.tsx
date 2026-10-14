import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  useNavigation,
  getFrontmostApplication,
  getSelectedFinderItems,
  LaunchProps,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { transcribeSource, normalizeSource } from "./utils/media";

export default function Command(props: LaunchProps<{ arguments: { source?: string } }>) {
  const [source, setSource] = useState(props.arguments.source ?? "");
  const [file, setFile] = useState<string[]>([]);
  const { push, pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState("");
  useEffect(() => {
    if (props.arguments.source) return;
    let active = true;
    void (async () => {
      try {
        if ((await getFrontmostApplication()).bundleId === "com.apple.finder") {
          const selected = await getSelectedFinderItems();
          if (selected[0]) {
            if (active) setSource((current) => current || selected[0].path);
            return;
          }
        }
      } catch {
        /* Finder selection is optional. */
      }
      try {
        const clipboard = await Clipboard.read();
        const preset = normalizeSource(clipboard.file ?? clipboard.text ?? "");
        if (active) setSource((current) => current || preset);
      } catch {
        /* Unrelated clipboard content is ignored. */
      }
    })();
    return () => {
      active = false;
    };
  }, [props.arguments.source]);
  async function submit() {
    if (isLoading) return;
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "FluidVoice" });
    try {
      const result = await transcribeSource(file[0] ?? source, (message) => {
        setProgress(message);
        toast.message = message;
      });
      push(
        <Detail
          navigationTitle="Transcript"
          markdown={result.text}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Transcript" content={result.text} />
              <Action title="Transcribe Another File" icon={Icon.ArrowLeft} onAction={pop} />
            </ActionPanel>
          }
        />,
      );
      toast.style = Toast.Style.Success;
      toast.title = "Transcription complete";
      toast.message = undefined;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Transcription failed";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsLoading(false);
      setProgress("");
    }
  }
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Transcribe" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="source"
        title="URL or File Path"
        value={source}
        onChange={setSource}
        placeholder="https://... or ~/Downloads/audio.mp3"
      />
      <Form.FilePicker
        id="file"
        title="Or Select a File"
        value={file}
        onChange={setFile}
        allowMultipleSelection={false}
        canChooseDirectories={false}
      />
      <Form.Description
        text={
          progress ||
          "Uses the speech model selected in FluidVoice. Web media is downloaded locally before transcription."
        }
      />
    </Form>
  );
}
