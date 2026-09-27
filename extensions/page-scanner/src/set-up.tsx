/**
 * Set up Page Scanner: the two steps between a fresh install and a first scan, each shown as
 * done or not, and checked again every few seconds until both are.
 *
 * 1. The helper, which Raycast installs when asked (the one step it can take for the user).
 * 2. Connect, in Page Scanner's settings in the browser. Only the user can press it: it is
 *    Chrome's own permission prompt.
 *
 * Whether the Chrome extension is installed at all cannot be told apart from step 2, since
 * a browser only shows up once it connects, so the store link sits in step 2.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Detail, Icon, Keyboard, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { runCli, type BrowsersAnswer, type StatusAnswer } from "./lib/cli";
import { installHelper } from "./lib/helper";
import { helperState } from "./lib/helper-state";
import { setUpMarkdown, STORE_URL, type Progress } from "./lib/set-up-markdown";

const POLL_MS = 3_000;

async function readProgress(): Promise<Progress> {
  const status = await runCli<StatusAnswer>(["status"]);
  if (!status.answer.ok) throw new Error(status.answer.message);
  const helper = helperState(status.answer);
  // `browsers` starts the daemon, which the helper waits for before it connects anything.
  const connected = helper === "ready" ? await runCli<BrowsersAnswer>(["browsers"]) : null;
  return {
    helper,
    helperNode: status.answer.nativeHost.node,
    browsers: connected?.answer.ok ? connected.answer.browsers.map((b) => b.label) : [],
  };
}

export default function SetUp() {
  const [progress, setProgress] = useState<Progress>();
  const [error, setError] = useState<string>();
  const [installing, setInstalling] = useState(false);
  const checking = useRef(false);

  const refresh = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    try {
      setProgress(await readProgress());
      setError(undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      checking.current = false;
    }
  }, []);

  const connected = (progress?.browsers.length ?? 0) > 0;
  // Checks at once and then every few seconds, until a browser is connected.
  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0);
    const timer = connected ? undefined : setInterval(() => void refresh(), POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh, connected]);

  const install = async () => {
    setInstalling(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Installing the helper" });
    try {
      const result = await installHelper();
      if (!result.answer.ok) throw new Error(result.answer.message);
      toast.style = Toast.Style.Success;
      toast.title = "Helper installed";
      toast.message = `It runs on ${result.answer.node}.`;
      await refresh();
    } catch (reason) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not install the helper";
      toast.message = reason instanceof Error ? reason.message : String(reason);
    } finally {
      setInstalling(false);
    }
  };

  const needsHelper = progress !== undefined && progress.helper !== "ready";
  return (
    <Detail
      isLoading={progress === undefined || installing}
      markdown={setUpMarkdown(progress, error)}
      actions={
        <ActionPanel>
          {connected ? (
            <Action
              title="Scan Current Tab"
              icon={Icon.Document}
              onAction={() => launchCommand({ name: "scan-current-tab", type: LaunchType.UserInitiated })}
            />
          ) : null}
          {needsHelper ? (
            <Action
              title={progress.helper === "missing" ? "Install Helper" : "Repair Helper"}
              icon={Icon.Download}
              onAction={install}
            />
          ) : null}
          <Action.OpenInBrowser title="Open Chrome Web Store" url={STORE_URL} />
          <Action
            title="Check Again"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => void refresh()}
          />
        </ActionPanel>
      }
    />
  );
}
