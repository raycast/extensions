/**
 * Run TextArray Tool — search a text tool and run it on the selected text (or
 * clipboard) entirely locally, then paste or copy the result.
 *
 * The tools are the exact same pure `run()` functions that power textarray.com,
 * imported through the generated catalog. Nothing is sent anywhere: the text is
 * read from the selection/clipboard, transformed in-process, and written back.
 * "Open on textarray.com" carries the input in the URL fragment (#s=…), which
 * the browser never sends to a server — same local-only guarantee as the site's
 * share links.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  Keyboard,
  List,
  Toast,
  closeMainWindow,
  getSelectedText,
  showHUD,
  showToast,
} from "@raycast/api";
import { catalog, type CatalogTool } from "./catalog.gen";

const SITE = "https://textarray.com";

/** UTF-8 → base64url, no padding — mirrors src/lib/share.ts encodeBase64Url. */
function encodeBase64Url(text: string): string {
  return Buffer.from(text, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** The tool's page with the input preloaded via the local-only #s= fragment. */
function toolUrl(tool: CatalogTool, input: string): string {
  const base = `${SITE}/${tool.slug}`;
  if (!input) return base;
  return `${base}#s=${encodeBase64Url(JSON.stringify({ input }))}`;
}

/** Selected text, falling back to the clipboard. Empty string when neither. */
async function readInput(): Promise<string> {
  try {
    const sel = await getSelectedText();
    if (sel) return sel;
  } catch {
    // no selection, or the frontmost app doesn't expose one — fall through
  }
  try {
    const clip = await Clipboard.readText();
    if (clip) return clip;
  } catch {
    // clipboard unavailable
  }
  return "";
}

interface RunResult {
  output?: string;
  error?: string;
  tally?: string;
}

async function runTool(tool: CatalogTool, input: string): Promise<RunResult> {
  try {
    const res = await tool.run(input, {}, { locale: "en" });
    if (res.error) return { error: res.error };
    const tally = res.tally.map((p) => p.text).join(" · ");
    return { output: res.output, tally };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "The tool failed to run.",
    };
  }
}

function groupByCategory(tools: CatalogTool[]): [string, CatalogTool[]][] {
  const groups = new Map<string, CatalogTool[]>();
  for (const tool of tools) {
    const list = groups.get(tool.category) ?? [];
    list.push(tool);
    groups.set(tool.category, list);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export default function Command() {
  const [input, setInput] = useState<string>("");
  const [loadingInput, setLoadingInput] = useState(true);

  useEffect(() => {
    readInput()
      .then(setInput)
      .finally(() => setLoadingInput(false));
  }, []);

  const sections = useMemo(() => groupByCategory(catalog), []);

  async function paste(tool: CatalogTool) {
    if (tool.mode === "transform" && !input) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text",
        message: "Select text or copy it first.",
      });
      return;
    }
    const res = await runTool(tool, input);
    if (res.error) {
      await showToast({
        style: Toast.Style.Failure,
        title: tool.name,
        message: res.error,
      });
      return;
    }
    await Clipboard.paste(res.output ?? "");
    await closeMainWindow();
    await showHUD(res.tally ? `Pasted · ${res.tally}` : "Pasted");
  }

  async function copy(tool: CatalogTool) {
    if (tool.mode === "transform" && !input) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text",
        message: "Select text or copy it first.",
      });
      return;
    }
    const res = await runTool(tool, input);
    if (res.error) {
      await showToast({
        style: Toast.Style.Failure,
        title: tool.name,
        message: res.error,
      });
      return;
    }
    await Clipboard.copy(res.output ?? "");
    await closeMainWindow();
    await showHUD(res.tally ? `Copied · ${res.tally}` : "Copied");
  }

  return (
    <List
      isLoading={loadingInput}
      searchBarPlaceholder="Search 150+ text tools…"
      navigationTitle={
        input ? `TextArray · ${input.length} chars in` : "TextArray"
      }
    >
      {sections.map(([category, tools]) => (
        <List.Section
          key={category}
          title={category}
          subtitle={`${tools.length}`}
        >
          {tools.map((tool) => (
            <List.Item
              key={tool.slug}
              title={tool.name}
              subtitle={tool.mode === "generate" ? "generator" : undefined}
              keywords={[tool.slug, tool.category]}
              icon={tool.mode === "generate" ? Icon.Stars : Icon.Text}
              actions={
                <ActionPanel>
                  <Action
                    title="Paste Result to App"
                    icon={Icon.Clipboard}
                    onAction={() => paste(tool)}
                  />
                  <Action
                    title="Copy Result to Clipboard"
                    icon={Icon.CopyClipboard}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "c" },
                      Windows: { modifiers: ["ctrl"], key: "c" },
                    }}
                    onAction={() => copy(tool)}
                  />
                  <Action.OpenInBrowser
                    title="Open on Textarray.com"
                    url={toolUrl(tool, input)}
                    shortcut={Keyboard.Shortcut.Common.Open}
                  />
                  <Action
                    title="Reload Input from Selection"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={async () => {
                      setLoadingInput(true);
                      setInput(await readInput());
                      setLoadingInput(false);
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
