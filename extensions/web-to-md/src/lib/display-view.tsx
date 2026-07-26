import { Action, ActionPanel, Detail, Icon, Toast, showInFinder, showToast, Keyboard } from "@raycast/api";
import { basename } from "node:path";
import { useEffect, useState } from "react";
import { convertWebpageToMarkdown } from "./convert";
import { saveMarkdownToFile } from "./save";
import type { CommandPreferences } from "./types";

type State =
  | { kind: "loading"; status: string }
  | {
      kind: "result";
      url: string;
      title?: string;
      markdown: string;
      body: string;
      savedPath?: string;
    }
  | { kind: "error"; message: string };

export function DisplayView(props: { url: string; html?: string; preferences: CommandPreferences }) {
  const { url, html, preferences } = props;
  const [state, setState] = useState<State>({
    kind: "loading",
    status: "Fetching page…",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await convertWebpageToMarkdown({
          url,
          html,
          preferences,
          onProgress: (status) => {
            if (!cancelled) setState({ kind: "loading", status });
          },
        });
        if (!cancelled) {
          setState({
            kind: "result",
            url: result.url,
            title: result.title,
            markdown: result.markdown,
            body: result.body,
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[web-to-md] conversion failed:", err);
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // Deliberately not depending on `preferences`: getPreferenceValues()
    // returns a fresh object every render, which would re-convert forever.
  }, [url, html]);

  async function saveToFile(result: Extract<State, { kind: "result" }>) {
    try {
      const outputPath = await saveMarkdownToFile({
        title: result.title,
        markdown: result.markdown,
        url: result.url,
        preferences,
      });
      setState({ ...result, savedPath: outputPath });
      await showToast({
        style: Toast.Style.Success,
        title: "Saved",
        message: basename(outputPath),
      });
    } catch (err) {
      console.error("[web-to-md] save failed:", err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (state.kind === "loading") {
    return <Detail isLoading markdown={`# ${state.status}`} />;
  }

  if (state.kind === "error") {
    return (
      <Detail
        markdown={`# Error\n\n${state.message}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Error" content={state.message} />
          </ActionPanel>
        }
      />
    );
  }

  // Hoisted so the truthiness check narrows inside the callback below.
  const savedPath = state.savedPath;

  return (
    <Detail
      markdown={state.body}
      navigationTitle={state.title}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy to Clipboard"
            content={state.markdown}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action
            title="Save to File"
            icon={Icon.SaveDocument}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={() => saveToFile(state)}
          />
          {savedPath && (
            <Action
              title="Show in Finder"
              icon={Icon.Finder}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={() => showInFinder(savedPath)}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
