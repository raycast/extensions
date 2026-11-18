import {
  Action,
  ActionPanel,
  Form,
  List,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
  environment,
} from "@raycast/api";
import { FlashData } from "@flashdata-dev/sdk";
import { useRef, useState } from "react";
import { countLimit, queryFor, resultRows, type Input, type Source, type Row } from "./tasks";
import { markdownText } from "./flashdata";

export function client() {
  return new FlashData({ apiKey: getPreferenceValues<Preferences>().apiKey.trim() });
}
export function docs(source: string) {
  return `https://flashdata.dev/docs/sources/${source}?utm_source=raycast&utm_medium=integration&utm_campaign=intent_gtm_2026q4&utm_content=${source}-task`;
}

function Results({ rows, raw }: { rows: Row[]; raw: unknown }) {
  const { pop } = useNavigation();
  const common = (
    <>
      <Action.CopyToClipboard title="Copy Results as JSON" content={JSON.stringify(raw, null, 2)} />
      <Action title="Edit Request" onAction={pop} />
    </>
  );
  return (
    <List isShowingDetail={!!rows.length} searchBarPlaceholder="Filter returned results…">
      {!rows.length ? (
        <List.EmptyView title="No Results Returned" actions={<ActionPanel>{common}</ActionPanel>} />
      ) : (
        rows.map((r, i) => (
          <List.Item
            key={i}
            title={r.title}
            icon={r.image}
            detail={
              <List.Item.Detail
                markdown={[r.title, r.info, r.body, r.link]
                  .filter(Boolean)
                  .map((x) => markdownText(x!))
                  .join("\n\n")}
              />
            }
            actions={
              <ActionPanel>
                {r.link && <Action.OpenInBrowser url={r.link} />}
                <Action.CopyToClipboard title="Copy Text" content={r.body || r.title} />
                {r.link && <Action.CopyToClipboard title="Copy Source URL" content={r.link} />}{" "}
                {r.asset && <Action.CopyToClipboard title="Copy Image URL" content={r.asset} />} {common}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
export default function QueryCommand() {
  const source = environment.commandName.replaceAll("-", "_") as Source;
  const { push } = useNavigation(),
    lock = useRef(false),
    [busy, setBusy] = useState(false);
  const google = source.startsWith("google_"),
    track = source === "youtube_captions" || source === "youtube_transcript",
    suggest = source === "youtube_suggestions",
    channel = source === "youtube_channel",
    video = track || source === "youtube_metadata" || source === "youtube_trainability";
  async function submit(v: Input) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const q = queryFor(source, v);
      const raw = await client().queries.realtime(q);
      if (raw.status !== "done" || !Array.isArray(raw.results))
        throw new Error("Search did not complete. Check FlashData history before retrying.");
      push(<Results rows={resultRows(source, raw.results)} raw={raw} />);
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Request Failed",
        message: e instanceof Error ? e.message : "Check your FlashData account before retrying.",
      });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Results" onSubmit={submit} />
          <Action.OpenInBrowser title="Open Command Guide" url={docs(source)} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="term"
        title={channel ? "Channel Handle" : video ? "Video URL or ID" : suggest ? "Search Prefix" : "Search Terms"}
        placeholder={channel ? "@YouTube" : video ? "https://www.youtube.com/watch?v=…" : undefined}
      />
      {countLimit(source) > 0 && (
        <Form.TextField
          id="count"
          title={`Results (1–${countLimit(source)})`}
          defaultValue={source === "youtube_search_extended" ? "50" : "10"}
        />
      )}{" "}
      {(google || suggest) && <Form.TextField id="country" title="Country" placeholder="Optional, e.g. us" />}
      {(google || suggest || track) && (
        <Form.TextField id="language" title="Language" placeholder="Optional, e.g. en" />
      )}
      <Form.Description
        text={
          source === "youtube_search_extended"
            ? "Extended search has a separate rate. Submitting uses FlashData Credits."
            : "Submitting uses FlashData Credits. Filtering returned results does not run another query."
        }
      />
    </Form>
  );
}
