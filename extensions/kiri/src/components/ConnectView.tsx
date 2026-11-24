import { Action, ActionPanel, Detail, Icon, open, showToast, Toast } from "@raycast/api";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cancelConnect, type ConnectStep, pollConnect, startConnect } from "../lib/account";
import { ApiError, PROGRESS_URL } from "../lib/api";
import { refreshMenuBar } from "../lib/engine";
import { getPendingConnect, type PendingConnect } from "../lib/storage";

type State = { step: "starting" } | ConnectStep;

/** How often the screen checks the stored attempt; the server's own interval still applies. */
const CHECK_EVERY_MS = 1000;

/**
 * Connect this Mac to a Kiri account with a short code the user allows on project-kiri.com
 * (a device sign-in, like a TV app). Raycast keeps only the token Kiri sends back.
 */
export default function ConnectView({ onConnected }: { onConnected?: () => void }) {
  const [state, setState] = useState<State>({ step: "starting" });
  const [attempt, setAttempt] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const loop = async () => {
      const next = await pollConnect();
      if (!alive.current) return;
      if (!next) {
        setState({ step: "expired" });
        return;
      }
      setState(next);
      if (next.step === "waiting") {
        timer = setTimeout(loop, CHECK_EVERY_MS);
      } else if (next.step === "done") {
        const name = next.connection.account.name;
        await showToast({ style: Toast.Style.Success, title: name ? `Connected as ${name}` : "Connected to Kiri" });
        await refreshMenuBar();
        onConnected?.();
      }
    };

    (async () => {
      setState({ step: "starting" });
      try {
        // Pick up an attempt still waiting (from an earlier visit), or start a new one.
        let pending: PendingConnect | null = await getPendingConnect();
        if (!pending || Date.now() >= pending.expiresAt) {
          pending = await startConnect();
          await open(pending.verificationUrl);
        }
        if (!alive.current) return;
        setState({ step: "waiting", pending });
        timer = setTimeout(loop, CHECK_EVERY_MS);
      } catch (err) {
        if (alive.current) {
          setState({
            step: "error",
            message: err instanceof ApiError ? err.message : "Kiri could not be reached. Try again.",
          });
        }
      }
    })();

    return () => {
      alive.current = false;
      if (timer) clearTimeout(timer);
    };
  }, [attempt]);

  const retry = async () => {
    await cancelConnect();
    setAttempt((n) => n + 1);
  };

  let markdown: string;
  let actions: ReactNode;
  switch (state.step) {
    case "starting":
      markdown = "# Connect to Kiri\n\nGetting a code…";
      actions = null;
      break;
    case "waiting":
      markdown = [
        "# Connect to Kiri",
        "",
        "Your browser opened **project-kiri.com**. Sign in, check that the code below matches, and choose **Allow**.",
        "",
        `## ${state.pending.userCode}`,
        "",
        "Waiting for you to allow it… You can close Raycast; Kiri Timer finishes connecting in the menu bar.",
        "",
        "Once connected, finished blocks are saved to your Kiri history, and the sounds in your Kiri plan play here.",
      ].join("\n");
      actions = (
        <ActionPanel>
          <Action.OpenInBrowser title="Open Connect Page Again" url={state.pending.verificationUrl} />
          <Action.CopyToClipboard title="Copy Code" content={state.pending.userCode} />
          <Action title="Get New Code" icon={Icon.ArrowClockwise} onAction={retry} />
        </ActionPanel>
      );
      break;
    case "done": {
      const a = state.connection.account;
      markdown = [
        "# Connected",
        "",
        `This Mac is connected to the Kiri account of **${a.name || "you"}**${a.emailHint ? ` (${a.emailHint})` : ""}.`,
        "",
        "Every focus block you finish is now saved to your Kiri history. You can disconnect in Focus History or on your Kiri progress page.",
      ].join("\n");
      actions = (
        <ActionPanel>
          <Action.OpenInBrowser title="Open Kiri Progress" url={PROGRESS_URL} />
        </ActionPanel>
      );
      break;
    }
    case "denied":
      markdown = "# Not connected\n\nThe request was denied on the Kiri site. Nothing was connected.";
      actions = (
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={retry} />
        </ActionPanel>
      );
      break;
    case "expired":
      markdown = "# The code expired\n\nCodes last 10 minutes. Start again to get a new one.";
      actions = (
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={retry} />
        </ActionPanel>
      );
      break;
    case "error":
      markdown = `# Could not connect\n\n${state.message}`;
      actions = (
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={retry} />
        </ActionPanel>
      );
      break;
  }

  return (
    <Detail isLoading={state.step === "starting" || state.step === "waiting"} markdown={markdown} actions={actions} />
  );
}
