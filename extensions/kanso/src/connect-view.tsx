// The setup screen. Every Kanso command shows <Connect> when it has no key
// (slices 16 and 17 render it and continue on `onConnected`).

import { Action, ActionPanel, Detail, Form, Keyboard, Toast, open, showToast, useNavigation } from "@raycast/api";
import { execFile } from "node:child_process";
import { useCallback, useEffect, useRef, useState } from "react";
import { KansoError, checkKey } from "./client";
import { Final, PairState, finalMessage, formatCode, pair } from "./pair";
import { env, looksLikeKey, port, saveKey } from "./session";

const INTRO = `# Connect Raycast to Kanso

Kanso must be open on this computer. Raycast will ask Kanso for a key that can add notes and tasks, search, and open notes.

Kanso then shows a sheet with a code. Check that it matches the code here, then choose **Allow**.`;

export function openKanso(): void {
  if (process.platform === "darwin") {
    execFile("open", ["-a", "Kanso"], () => undefined);
  } else {
    void open("kanso://");
  }
}

export function Connect(props: { onConnected?: () => void }) {
  const [state, setState] = useState<PairState | undefined>();
  const abort = useRef<AbortController | undefined>(undefined);

  useEffect(() => () => abort.current?.abort(), []);

  const start = useCallback(async () => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    let portNumber: number;
    try {
      portNumber = port();
    } catch (e) {
      setState({ step: "error", error: e as KansoError });
      return;
    }
    const final = await pair(env, portNumber, { onState: setState, signal: controller.signal });
    if (controller.signal.aborted) return;
    await announce(final);
    if (final.step === "connected") {
      await saveKey(final.key);
      props.onConnected?.();
    }
  }, [props]);

  const waiting = state?.step === "waiting";
  const markdown = body(state);
  const failed =
    state !== undefined && state.step !== "starting" && state.step !== "waiting" && state.step !== "connected";
  const kansoClosed = state?.step === "error" && state.error.kind === "not-open";

  return (
    <Detail
      navigationTitle="Connect to Kanso"
      markdown={markdown}
      actions={
        <ActionPanel>
          {!waiting && state?.step !== "starting" && state?.step !== "connected" && (
            <Action title={failed ? "Try Again" : "Connect"} onAction={start} />
          )}
          {kansoClosed && <Action title="Open Kanso" onAction={openKanso} shortcut={Keyboard.Shortcut.Common.Open} />}
          <Action.Push title="Paste a Key" target={<PasteKey onConnected={props.onConnected} />} />
        </ActionPanel>
      }
    />
  );
}

function body(state: PairState | undefined): string {
  if (!state) return INTRO;
  switch (state.step) {
    case "starting":
      return "# Waiting for Kanso…";
    case "waiting":
      return `# Waiting for Kanso…\n\nCode **${formatCode(state.code)}**\n\nCheck that Kanso shows the same code, then choose **Allow** there. The request expires after 2 minutes.`;
    case "connected":
      return "# Connected to Kanso";
    default: {
      const { title, message } = finalMessage(state);
      return `# ${title}${message ? `\n\n${message}` : ""}\n\n${INTRO_HINT}`;
    }
  }
}

const INTRO_HINT =
  "You can also paste a key made by hand under Kanso › Settings › Local API › API keys (action: Paste a Key).";

async function announce(final: Final): Promise<void> {
  const { title, message } = finalMessage(final);
  await showToast({
    style: final.step === "connected" ? Toast.Style.Success : Toast.Style.Failure,
    title,
    message,
  });
}

export function PasteKey(props: { onConnected?: () => void }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string | undefined>();

  async function submit(values: { key: string }) {
    const key = values.key.trim();
    if (!looksLikeKey(key)) {
      setError("A key starts with kcl_");
      return;
    }
    try {
      const portNumber = port();
      if ((await checkKey(env, portNumber, key)) === "unauthorized") {
        setError("Kanso doesn't know this key.");
        return;
      }
      await saveKey(key);
      await showToast({ style: Toast.Style.Success, title: "Connected to Kanso" });
      props.onConnected?.();
      pop();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: e instanceof KansoError ? e.message : "Couldn't check the key",
      });
    }
  }

  return (
    <Form
      navigationTitle="Paste a Key"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Key" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.PasswordField
        id="key"
        title="Key"
        placeholder="kcl_..."
        error={error}
        onChange={() => setError(undefined)}
        info="Make one under Kanso › Settings › Local API › API keys."
      />
    </Form>
  );
}
