import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  Toast,
  showInFinder,
  showToast,
} from "@raycast/api";
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
      savedPath?: string;
    }
  | { kind: "error"; message: string };

export function DisplayView(props: {
  url: string;
  preferences: CommandPreferences;
  onBeforeStart?: string;
}) {
  const { url, preferences } = props;
  const [state, setState] = useState<State>({
    kind: "loading",
    status: props.onBeforeStart ?? "Fetching page…",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await convertWebpageToMarkdown({
          url,
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
          });
        }
      } catch (err) {
        if (!cancelled) {
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
  }, [url]);

  async function copyMarkdown(markdown: string) {
    await Clipboard.copy(markdown);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
    });
  }

  async function saveToFile(s: Extract<State, { kind: "result" }>) {
    try {
      const outputPath = await saveMarkdownToFile({
        title: s.title,
        markdown: s.markdown,
        url: s.url,
        preferences,
      });
      setState({ ...s, savedPath: outputPath });
      await showToast({
        style: Toast.Style.Success,
        title: "Saved",
        message: basename(outputPath),
      });
    } catch (err) {
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
    return <Detail markdown={`# Error\n\n${state.message}`} />;
  }

  return (
    <Detail
      markdown={state.markdown}
      navigationTitle={state.title}
      actions={
        <ActionPanel>
          <Action
            title="Copy to Clipboard"
            icon={Icon.Clipboard}
            onAction={() => copyMarkdown(state.markdown)}
          />
          <Action
            title="Save to File"
            icon={Icon.SaveDocument}
            onAction={() => saveToFile(state)}
          />
          {state.savedPath && (
            <Action
              title="Show in Finder"
              icon={Icon.Finder}
              onAction={() => showInFinder(state.savedPath as string)}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
