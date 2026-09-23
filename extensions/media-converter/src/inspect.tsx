import { useEffect, useState } from "react";
import { Action, ActionPanel, Form, Icon, List, getSelectedFinderItems } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import path from "node:path";
import { formatBytes } from "./utils/format";
import { formatTimeString } from "./utils/time";
import { inspectMedia, type MediaInspection, type MediaStream } from "./utils/mediaProbe";

export default function Command() {
  const [files, setFiles] = useState<string[] | null>(null);

  useEffect(() => {
    getSelectedFinderItems()
      .then((items) => setFiles(items.map((item) => item.path)))
      .catch(() => setFiles([]));
  }, []);

  if (files === null) return <List isLoading />;
  if (files.length === 0) return <InspectorPicker onSelect={setFiles} />;
  return <InspectionList files={files} onChooseFiles={() => setFiles([])} />;
}

function InspectorPicker({ onSelect }: { onSelect: (files: string[]) => void }) {
  const [files, setFiles] = useState<string[]>([]);
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Inspect Media" icon={Icon.MagnifyingGlass} onSubmit={() => onSelect(files)} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" title="Media Files" allowMultipleSelection value={files} onChange={setFiles} />
    </Form>
  );
}

function InspectionList({ files, onChooseFiles }: { files: string[]; onChooseFiles: () => void }) {
  const [items, setItems] = useState<Map<string, MediaInspection>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      files.map(async (file) => {
        try {
          return [file, await inspectMedia(file)] as const;
        } catch (error) {
          await showFailureToast(error, { title: `Could not inspect ${path.basename(file)}` });
          return null;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setItems(new Map(results.filter((result): result is readonly [string, MediaInspection] => result !== null)));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [files.join("\0")]);

  return (
    <List isLoading={loading} isShowingDetail searchBarPlaceholder="Search inspected media">
      {files.map((file) => {
        const inspection = items.get(file);
        return (
          <List.Item
            key={file}
            icon={Icon.FilmStrip}
            title={path.basename(file)}
            subtitle={inspection?.container ?? path.extname(file)}
            accessories={inspection ? [{ text: formatBytes(inspection.sizeBytes) }] : []}
            detail={inspection ? <InspectionDetail inspection={inspection} /> : undefined}
            actions={
              <ActionPanel>
                <Action.Open title="Open File" target={file} />
                <Action.ShowInFinder path={file} />
                <Action title="Choose Other Files" icon={Icon.Folder} onAction={onChooseFiles} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function InspectionDetail({ inspection }: { inspection: MediaInspection }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="File" text={inspection.fileName} />
          <List.Item.Detail.Metadata.Label title="Size" text={formatBytes(inspection.sizeBytes)} />
          <List.Item.Detail.Metadata.Label title="Container" text={inspection.container ?? "Unknown"} />
          <List.Item.Detail.Metadata.Label
            title="Duration"
            text={inspection.durationSec === undefined ? "Unknown" : formatTimeString(inspection.durationSec)}
          />
          <List.Item.Detail.Metadata.Label
            title="Bitrate"
            text={inspection.bitrateKbps === undefined ? "Unknown" : `${inspection.bitrateKbps} kbps`}
          />
          {inspection.streams.map((stream) => (
            <List.Item.Detail.Metadata.Label
              key={stream.index}
              title={`${stream.type[0].toUpperCase()}${stream.type.slice(1)} ${stream.index}`}
              text={describeStream(stream)}
            />
          ))}
          {Object.entries(inspection.metadata).map(([key, value]) => (
            <List.Item.Detail.Metadata.Label key={key} title={key} text={value} />
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function describeStream(stream: MediaStream): string {
  const details = [stream.codec];
  if (stream.width && stream.height) details.push(`${stream.width}×${stream.height}`);
  if (stream.frameRate) details.push(`${stream.frameRate} fps`);
  if (stream.pixelFormat) details.push(stream.pixelFormat);
  if (stream.sampleRate) details.push(`${stream.sampleRate} Hz`);
  if (stream.channels) details.push(stream.channels);
  if (stream.bitrateKbps) details.push(`${stream.bitrateKbps} kbps`);
  if (stream.language) details.push(stream.language);
  return details.filter(Boolean).join(" · ");
}
