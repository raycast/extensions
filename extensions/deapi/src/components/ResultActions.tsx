import { Action, ActionPanel, Clipboard, Icon, Keyboard, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { HistoryRecord, isImageKind } from "../lib/history";
import { EditImageForm } from "./EditImageForm";
import { GenerateVideoForm } from "./GenerateVideoForm";
import { ImageToolForm } from "./ImageToolForm";

export function ResultActions(props: { record: HistoryRecord; extra?: React.ReactNode }) {
  const { record } = props;
  if (record.status !== "done") {
    return <ActionPanel>{props.extra}</ActionPanel>;
  }

  if (record.kind === "transcription") {
    const text = record.text ?? "";
    return (
      <ActionPanel>
        <Action.CopyToClipboard title="Copy Transcript" content={text} />
        <Action.Paste title="Paste Transcript" content={text} />
        <Action.CreateSnippet title="Save as Snippet" snippet={{ text, name: truncate(record.input, 60) }} />
        {props.extra}
      </ActionPanel>
    );
  }

  const file = record.filePath;
  const image = isImageKind(record.kind);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {file ? (
          <Action.Open
            title={record.kind === "speech" || record.kind === "video" ? "Play" : "Open"}
            icon={record.kind === "speech" || record.kind === "video" ? Icon.Play : Icon.Eye}
            target={file}
          />
        ) : null}
        {file && image ? (
          <Action
            title="Copy Image"
            icon={Icon.Clipboard}
            onAction={async () => {
              try {
                await Clipboard.copy({ file });
                await showHUD("Copied image");
              } catch (error) {
                await showFailureToast(error, { title: "Could not copy the image" });
              }
            }}
          />
        ) : null}
        {file ? <Action.ShowInFinder path={file} /> : null}
        {record.resultUrl ? (
          <Action.CopyToClipboard
            title="Copy Result URL"
            content={record.resultUrl}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        ) : null}
        {record.kind !== "speech" && record.kind !== "video" && record.input ? (
          <Action.CopyToClipboard title="Copy Prompt" content={record.input} />
        ) : null}
      </ActionPanel.Section>
      {file && image ? (
        <ActionPanel.Section title="Continue with This Image">
          <Action.Push title="Edit Image" icon={Icon.Pencil} target={<EditImageForm initialFile={file} />} />
          <Action.Push
            title="Animate into Video"
            icon={Icon.FilmStrip}
            target={<GenerateVideoForm initialImage={file} initialPrompt={record.input} />}
          />
          <Action.Push
            title="Remove Background"
            icon={Icon.Eraser}
            target={<ImageToolForm tool="background" initialFile={file} />}
          />
          <Action.Push
            title="Upscale Image"
            icon={Icon.Maximize}
            target={<ImageToolForm tool="upscale" initialFile={file} />}
          />
        </ActionPanel.Section>
      ) : null}
      {props.extra}
    </ActionPanel>
  );
}

function truncate(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}
