import { Action, ActionPanel, Form, Icon, PopToRootType, showHUD, showToast, Toast } from "@raycast/api";
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { useEffect, useState } from "react";
import { GENERAL_HEADING } from "./lib/html";
import { strings } from "./lib/strings";
import { Capture, capture } from "./lib/players";
import { activeSession, recordingUrl, Session, setRecordingUrl } from "./lib/session";
import { formatTimecode, timecodeSlug } from "./lib/timecode";

type State = { session: Session; capture: Capture } | { error: string } | null;

// A comment starting with "--" is a general note without a timecode or frame.
const GENERAL_PREFIX = "--";

function freeShotName(session: Session, seconds: number): string {
  const slug = timecodeSlug(seconds);
  let name = `${slug}.jpg`;
  for (let i = 2; existsSync(join(session.shotsDir, name)); i++) name = `${slug}-${i}.jpg`;
  return name;
}

function appendBlock(session: Session, block: string) {
  const current = readFileSync(session.notesPath, "utf8");
  const separator = current === "" || current.endsWith("\n\n") ? "" : current.endsWith("\n") ? "\n" : "\n\n";
  appendFileSync(session.notesPath, separator + block);
}

export function appendNote(session: Session, captured: Capture, comment: string) {
  mkdirSync(session.shotsDir, { recursive: true });
  const shot = freeShotName(session, captured.seconds);
  const shotPath = join(session.shotsDir, shot);
  copyFileSync(captured.framePath, shotPath);

  const body = comment.trim();
  try {
    appendBlock(session, `## ${formatTimecode(captured.seconds)}\n![](shots/${shot})\n${body ? `\n${body}\n` : ""}\n`);
  } catch (error) {
    // Keep the temp frame so the note can be saved again.
    rmSync(shotPath, { force: true });
    throw error;
  }
  rmSync(captured.framePath, { force: true });
}

export function appendGeneralNote(session: Session, text: string) {
  appendBlock(session, `${GENERAL_HEADING}\n\n${text}\n\n`);
}

export default function Command() {
  const [state, setState] = useState<State>(null);

  useEffect(() => {
    (async () => {
      try {
        const session = await activeSession();
        setState({ session, capture: await capture() });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setState({ error: message });
        await showToast({ style: Toast.Style.Failure, title: strings.failed, message });
      }
    })();
  }, []);

  if (state && "error" in state) {
    return (
      <Form>
        <Form.Description title={strings.error} text={state.error} />
      </Form>
    );
  }

  const timecode = state ? formatTimecode(state.capture.seconds) : "";

  async function submit(values: { comment: string }) {
    if (!state || "error" in state) return;
    const { session, capture: captured } = state;
    const text = values.comment.trim();
    let hud: string;
    try {
      if (text.startsWith(GENERAL_PREFIX)) {
        const body = text.slice(GENERAL_PREFIX.length).trim();
        if (body) appendGeneralNote(session, body);
        rmSync(captured.framePath, { force: true });
        hud = body ? strings.generalAdded : strings.emptyNote;
      } else {
        appendNote(session, captured, text);
        hud = strings.noteAdded(timecode);
      }
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: strings.failed, message: String(error) });
      return;
    }
    // Do not overwrite a link the user has corrected in Build Video Notes HTML.
    if (captured.recordingUrl && !(await recordingUrl(session))) {
      await setRecordingUrl(session, captured.recordingUrl);
    }
    await captured.resume().catch(() => undefined);
    // Otherwise Raycast keeps the form alive and the next hotkey shows the old text and frame.
    await showHUD(hud, { popToRootType: PopToRootType.Immediate });
  }

  return (
    <Form
      isLoading={!state}
      navigationTitle={state ? `${strings.note} · ${timecode}` : strings.capturing}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={strings.add} icon={Icon.Plus} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description title={strings.timecode} text={state ? `${timecode} · ${state.session.name}` : "…"} />
      <Form.TextArea id="comment" title={strings.comment} info={strings.commentInfo} autoFocus enableMarkdown />
    </Form>
  );
}
