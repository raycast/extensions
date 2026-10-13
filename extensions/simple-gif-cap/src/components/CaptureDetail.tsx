import { Color, Detail, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { previewPath, trimmedDuration } from "../lib/capture";
import { encoderName, formatSeconds, formatSize, SHARE_LIMIT_BYTES } from "../lib/encode";
import { Capture } from "../lib/history";
import { CaptureActions } from "./CaptureActions";

function imageMarkdown(path: string): string {
  return `![GIF](${encodeURI(`file://${path}`)}?raycast-height=360)`;
}

function currentEncoder(): string {
  try {
    return encoderName();
  } catch {
    return "unavailable";
  }
}

export function CaptureDetail(props: {
  capture: Capture;
  /** Set when pushed onto another view; Raycast wants navigation titles on nested screens only. */
  nested?: boolean;
  onUpdate?: (next: Capture | undefined) => void;
}) {
  const [capture, setCapture] = useState<Capture | undefined>(props.capture);
  const { pop } = useNavigation();
  const { data: preview } = usePromise(
    async (current?: Capture) => (current ? previewPath(current) : undefined),
    [capture],
  );

  const update = (next: Capture | undefined) => {
    setCapture(next);
    props.onUpdate?.(next);
    if (!next) {
      pop();
    }
  };

  if (!capture) {
    return <Detail markdown="Deleted." />;
  }

  const { settings } = capture;
  const size = capture.size ?? 0;
  const trimmed = settings.start > 0 || settings.end !== undefined;

  return (
    <Detail
      isLoading={!preview}
      navigationTitle={props.nested ? new Date(capture.createdAt).toLocaleString() : undefined}
      markdown={preview ? imageMarkdown(preview) : ""}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Size">
            <Detail.Metadata.TagList.Item
              text={formatSize(size)}
              color={size > SHARE_LIMIT_BYTES ? Color.Orange : Color.Green}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Dimensions" text={`${capture.width ?? "?"} x ${capture.height ?? "?"}`} />
          <Detail.Metadata.Label
            title="Duration"
            text={`${formatSeconds(trimmedDuration(capture))}${trimmed ? ` of ${formatSeconds(capture.duration)}` : ""}`}
          />
          <Detail.Metadata.Label title="Frame Rate" text={`${settings.fps} fps`} />
          <Detail.Metadata.Label title="Encoder" text={currentEncoder()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="File" text={capture.gifPath.split("/").pop()} />
          {size > SHARE_LIMIT_BYTES && (
            <Detail.Metadata.Label title="Tip" text="Over 10 MB. Press Cmd+F to fit it for Slack." />
          )}
        </Detail.Metadata>
      }
      actions={<CaptureActions capture={capture} onUpdate={update} />}
    />
  );
}
