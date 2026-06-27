import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  Keyboard,
  Toast,
  environment,
  getPreferenceValues,
  open,
  showToast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { deflate } from "pako";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { useCallback, useEffect, useState } from "react";

// Width of the rendered PNG. Larger = sharper on Retina, scaled down to fit the Detail pane.
const RENDER_WIDTH = 1400;

function resolveTheme(pref: Preferences["theme"]): string {
  if (pref === "auto") {
    return environment.appearance === "dark" ? "dark" : "default";
  }
  return pref;
}

// mermaid.ink / mermaid.live "pako" payload: deflate(JSON) -> base64url, prefixed with "pako:".
function encodePako(code: string, theme: string): string {
  const state = {
    code,
    mermaid: JSON.stringify({ theme }),
    autoSync: true,
    updateDiagram: true,
  };
  const compressed = deflate(JSON.stringify(state), { level: 9 });
  const base64url = Buffer.from(compressed).toString("base64url");
  return `pako:${base64url}`;
}

function imageUrl(payload: string): string {
  return `https://mermaid.ink/img/${payload}?type=png&width=${RENDER_WIDTH}`;
}

function editorUrl(payload: string): string {
  return `https://mermaid.live/edit#${payload}`;
}

interface RenderState {
  isLoading: boolean;
  markdown: string;
  imagePath?: string;
  imageUrl?: string;
  editorUrl?: string;
  source?: string;
}

export default function RenderMermaid() {
  const { theme } = getPreferenceValues<Preferences>();
  const [state, setState] = useState<RenderState>({
    isLoading: true,
    markdown: "",
  });

  const render = useCallback(async () => {
    setState({ isLoading: true, markdown: "" });

    const code = (await Clipboard.readText())?.trim();
    if (!code) {
      setState({
        isLoading: false,
        markdown:
          "# No Mermaid code found\n\nCopy some Mermaid code to the clipboard, then run this command again.",
      });
      return;
    }

    const payload = encodePako(code, resolveTheme(theme));
    const url = imageUrl(payload);
    const editUrl = editorUrl(payload);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        // mermaid.ink returns the parse error in the body on 4xx/5xx.
        const detail = (await response.text()).trim();
        throw new Error(
          detail || `mermaid.ink responded with ${response.status}`,
        );
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      // Content-hashed filename: distinct diagrams get distinct paths, so the
      // Detail pane never serves a stale image from a colliding name.
      const hash = createHash("sha256")
        .update(buffer)
        .digest("hex")
        .slice(0, 16);
      const imagePath = join(environment.supportPath, `mermaid-${hash}.png`);
      await writeFile(imagePath, buffer);

      // supportPath contains a space ("Application Support"); a bare path breaks
      // markdown image syntax, so render it as a properly-encoded file:// URL.
      const fileUrl = pathToFileURL(imagePath).href;
      setState({
        isLoading: false,
        markdown: `![Mermaid diagram](${fileUrl})`,
        imagePath,
        imageUrl: url,
        editorUrl: editUrl,
        source: code,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await showFailureToast(error, { title: "Failed to render diagram" });
      setState({
        isLoading: false,
        markdown: [
          "# Could not render diagram",
          "",
          "The clipboard content could not be rendered by mermaid.ink:",
          "",
          "```",
          message,
          "```",
          "",
          "## Clipboard content",
          "",
          "```mermaid",
          code,
          "```",
        ].join("\n"),
        editorUrl: editUrl,
        source: code,
      });
    }
  }, [theme]);

  useEffect(() => {
    render();
  }, [render]);

  return (
    <Detail
      isLoading={state.isLoading}
      markdown={state.markdown}
      actions={
        <ActionPanel>
          {state.imagePath && (
            <Action
              title="Copy Image to Clipboard"
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy({ file: state.imagePath! });
                await showToast({
                  style: Toast.Style.Success,
                  title: "Image copied",
                });
              }}
            />
          )}
          {state.editorUrl && (
            <Action
              title="Open in Mermaid Live Editor"
              icon={Icon.Globe}
              onAction={() => open(state.editorUrl!)}
            />
          )}
          {state.imageUrl && (
            <Action.CopyToClipboard
              title="Copy Image URL"
              icon={Icon.Link}
              content={state.imageUrl}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
          {state.source && (
            <Action.CopyToClipboard
              title="Copy Source"
              icon={Icon.Code}
              content={state.source}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          )}
          <Action
            title="Reload from Clipboard"
            icon={Icon.ArrowClockwise}
            onAction={render}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        </ActionPanel>
      }
    />
  );
}
