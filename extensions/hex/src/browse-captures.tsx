import { Action, ActionPanel, Detail, Grid, Icon, Keyboard } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { useMemo, useState } from "react";
import { GridErrorView } from "./components/error-view";
import { Capture, CaptureKind, loadCaptures } from "./lib/captures";
import { copyOrPaste, showHexFailure } from "./lib/feedback";
import { formatDuration, formatTime, groupByDay } from "./lib/format";
import { hex } from "./lib/hex";
import { AnnotationDetail } from "./lib/types";

const ALL = "all";

const KIND_LABELS: Record<CaptureKind, string> = {
  screenshot: "Screenshot",
  recording: "Screen Recording",
  annotation: "Annotation",
};

const KIND_ICONS: Record<CaptureKind, Icon> = {
  screenshot: Icon.Image,
  recording: Icon.Video,
  annotation: Icon.Pencil,
};

function subtitle(capture: Capture): string {
  const time = formatTime(capture.createdAt);
  const annotation = capture.annotation;
  if (!annotation) return time;
  const parts = [annotation.app ?? time];
  if (annotation.duration_ms) parts.push(formatDuration(annotation.duration_ms));
  return parts.join(" · ");
}

export default function Command() {
  const [kind, setKind] = useState<string>(ALL);
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, error, revalidate } = usePromise(loadCaptures, [], {
    onError: () => undefined,
    onData: ({ failures }) => {
      const failure = failures[0];
      if (failure) {
        showHexFailure(failure.error, `Couldn't load ${failure.source}`);
      }
    },
  });

  const sections = useMemo(() => {
    const shown = (data?.captures ?? []).filter((capture) => kind === ALL || capture.kind === kind);
    return groupByDay(shown, (capture) => capture.createdAt);
  }, [data, kind]);
  const filtered = searchText !== "" || kind !== ALL;

  return (
    <Grid
      isLoading={isLoading}
      columns={4}
      aspectRatio="16/9"
      fit={Grid.Fit.Contain}
      filtering
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search captures"
      searchBarAccessory={
        <Grid.Dropdown tooltip="Kind" onChange={setKind} storeValue>
          <Grid.Dropdown.Item title="All Captures" value={ALL} />
          <Grid.Dropdown.Item title="Screenshots" value="screenshot" icon={Icon.Image} />
          <Grid.Dropdown.Item title="Screen Recordings" value="recording" icon={Icon.Video} />
          <Grid.Dropdown.Item title="Annotations" value="annotation" icon={Icon.Pencil} />
        </Grid.Dropdown>
      }
    >
      {error ? (
        <GridErrorView error={error} onRetry={revalidate} />
      ) : isLoading ? null : (
        <Grid.EmptyView
          icon={Icon.Camera}
          title={filtered ? "No matching captures" : "No captures yet"}
          description={filtered ? undefined : "Take a screenshot or record an annotation in Hex."}
        />
      )}
      {sections.map((section) => (
        <Grid.Section key={section.title} title={section.title}>
          {section.items.map((capture) => (
            <CaptureItem key={capture.id} capture={capture} onChange={revalidate} />
          ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}

function CaptureItem({ capture, onChange }: { capture: Capture; onChange: () => void }) {
  const label = KIND_LABELS[capture.kind];
  const previewPath = capture.kind === "annotation" ? capture.video : capture.path;
  return (
    <Grid.Item
      title={label}
      subtitle={subtitle(capture)}
      content={capture.thumbnail ? { source: capture.thumbnail } : { source: KIND_ICONS[capture.kind] }}
      keywords={[label, capture.annotation?.app ?? ""].filter(Boolean)}
      quickLook={previewPath ? { path: previewPath, name: label } : undefined}
      actions={
        capture.kind === "annotation" ? (
          <AnnotationActions capture={capture} />
        ) : (
          <FileActions capture={capture} onTrash={onChange} />
        )
      }
    />
  );
}

function FileActions({ capture, onTrash }: { capture: Capture; onTrash: () => void }) {
  const file = { file: capture.path };
  const noun = capture.kind === "screenshot" ? "Image" : "File";
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Paste title={`Paste ${noun}`} content={file} />
        <Action.CopyToClipboard title={`Copy ${noun}`} content={file} />
        <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
        <Action.Open title="Open" target={capture.path} shortcut={Keyboard.Shortcut.Common.Open} />
        <Action.ShowInFinder path={capture.path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Path" content={capture.path} shortcut={Keyboard.Shortcut.Common.CopyPath} />
        <Action.Trash paths={capture.path} onTrash={onTrash} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

async function copyOrPasteSummary(path: string, mode: "copy" | "paste") {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    const missing = error instanceof Error && "code" in error && error.code === "ENOENT";
    await showFailureToast(
      error,
      missing
        ? { title: "Couldn't find the summary", message: "It was moved or deleted" }
        : { title: "Couldn't read the summary" },
    );
    return;
  }
  await copyOrPaste(text, mode, "Copied summary");
}

function AnnotationActions({ capture }: { capture: Capture }) {
  const summary = capture.summary;
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Push title="Show Details" icon={Icon.Sidebar} target={<AnnotationDetailView capture={capture} />} />
        {summary && (
          <>
            <Action
              title="Paste Summary for Agent"
              icon={Icon.Clipboard}
              onAction={() => copyOrPasteSummary(summary, "paste")}
            />
            <Action
              title="Copy Summary for Agent"
              icon={Icon.CopyClipboard}
              shortcut={Keyboard.Shortcut.Common.Copy}
              onAction={() => copyOrPasteSummary(summary, "copy")}
            />
          </>
        )}
        {capture.video && (
          <>
            <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
            <Action.Open
              title="Open Recording"
              icon={Icon.Play}
              target={capture.video}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          </>
        )}
        <Action.ShowInFinder path={capture.path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
        <Action.CopyToClipboard
          title="Copy Folder Path"
          content={capture.path}
          shortcut={Keyboard.Shortcut.Common.CopyPath}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function imageMarkdown(path: string, alt: string): string {
  const url = pathToFileURL(path).href.replaceAll("(", "%28").replaceAll(")", "%29");
  return `![${alt}](${url}?raycast-width=700)`;
}

function AnnotationDetailView({ capture }: { capture: Capture }) {
  const summary = capture.summary;
  const id = capture.annotation?.id ?? capture.path;
  const { data, isLoading } = usePromise((id: string) => hex<AnnotationDetail>(["annotate", "show", id]), [id], {
    onError: (error) => showHexFailure(error, "Couldn't read the annotation"),
  });

  const words =
    data?.transcript?.trim() ||
    data?.note?.trim() ||
    (data?.missing_transcript ? `_No transcript: ${data.missing_transcript}_` : "");
  const image = data?.contact_sheet ?? capture.thumbnail;
  const markdown = [image ? imageMarkdown(image, "Contact sheet") : "", words].filter(Boolean).join("\n\n");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Annotation"
      markdown={markdown}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="When" text={capture.createdAt.toLocaleString()} />
            {data.app && <Detail.Metadata.Label title="App" text={data.app} />}
            {data.window_title && <Detail.Metadata.Label title="Window" text={data.window_title} />}
            {data.duration_ms !== null && (
              <Detail.Metadata.Label title="Length" text={formatDuration(data.duration_ms)} />
            )}
            <Detail.Metadata.Label title="Words" text={String(data.words)} />
            <Detail.Metadata.Label title="Marks" text={String(data.marks)} />
            <Detail.Metadata.Label title="Keyframes" text={String(data.keyframes)} />
            {data.sent_to && <Detail.Metadata.Label title="Sent To" text={data.sent_to.title} />}
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          {summary && (
            <>
              <Action
                title="Paste Summary for Agent"
                icon={Icon.Clipboard}
                onAction={() => copyOrPasteSummary(summary, "paste")}
              />
              <Action
                title="Copy Summary for Agent"
                icon={Icon.CopyClipboard}
                onAction={() => copyOrPasteSummary(summary, "copy")}
              />
            </>
          )}
          {data?.transcript && <Action.CopyToClipboard title="Copy Transcript" content={data.transcript} />}
          {data?.video && <Action.Open title="Open Recording" icon={Icon.Play} target={data.video} />}
          <Action.ShowInFinder path={capture.path} />
        </ActionPanel>
      }
    />
  );
}
