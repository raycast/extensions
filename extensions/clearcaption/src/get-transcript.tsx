import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  getPreferenceValues,
  LaunchProps,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { clock, fetchTranscript, toSrt, toText } from "./transcript";

type Args = { video?: string; translateTo?: string };

function TranscriptView({ video, translateTo }: { video: string; translateTo?: string }) {
  const { apifyToken } = getPreferenceValues<Preferences>();
  const { data, isLoading, error } = usePromise(
    (v: string, lang?: string) => fetchTranscript(v, apifyToken, lang),
    [video, translateTo || undefined],
  );
  const md = error
    ? `**${error.message}**`
    : data
      ? `# ${data.title || data.videoId}\n\n` + data.segments.map((s) => `\`${clock(s.start)}\` ${s.text}`).join("  \n")
      : "";
  return (
    <Detail
      isLoading={isLoading}
      markdown={md}
      navigationTitle={translateTo ? `Transcript (${translateTo})` : "Transcript"}
      actions={
        data && (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Text" content={toText(data.segments)} />
            <Action.CopyToClipboard title="Copy SRT" content={toSrt(data.segments)} />
            <Action.CopyToClipboard
              title="Copy with Timestamps"
              content={data.segments.map((s) => `[${clock(s.start)}] ${s.text}`).join("\n")}
            />
            <Action.OpenInBrowser url={`https://www.youtube.com/watch?v=${data.videoId}`} />
          </ActionPanel>
        )
      }
    />
  );
}

function AskVideo({ initial, translateTo }: { initial: string; translateTo?: string }) {
  const { push } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Get Transcript"
            onSubmit={(v: { video: string; translateTo: string }) =>
              push(<TranscriptView video={v.video.trim()} translateTo={v.translateTo.trim() || undefined} />)
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="video" title="YouTube URL or ID" defaultValue={initial} />
      <Form.TextField
        id="translateTo"
        title="Translate To"
        placeholder="de, es, uk ... (optional)"
        defaultValue={translateTo}
      />
    </Form>
  );
}

export default function Command(props: LaunchProps<{ arguments: Args }>) {
  const { video, translateTo } = props.arguments;
  const [fromClipboard, setFromClipboard] = useState<string>();
  useEffect(() => {
    if (!video) Clipboard.readText().then((t) => setFromClipboard(t && /youtu/.test(t) ? t.trim() : ""));
  }, [video]);
  if (video) return <TranscriptView video={video.trim()} translateTo={translateTo?.trim() || undefined} />;
  if (fromClipboard === undefined) return <Detail isLoading markdown="" />;
  return <AskVideo initial={fromClipboard} translateTo={translateTo} />;
}
