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
  Color,
  Detail,
  Icon,
  List,
  LocalStorage,
  Toast,
  closeMainWindow,
  getSelectedText,
  showHUD,
  showToast,
  Keyboard,
  useNavigation,
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

const NO_INPUT = "No text. Select text or copy it first.";

const USE_AS_INPUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "i" },
  Windows: { modifiers: ["ctrl", "shift"], key: "i" },
};

/** Pinned slugs, kept in Raycast's own LocalStorage — never leaves the Mac. */
const PINNED_KEY = "pinned";

async function readPinned(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(PINNED_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string")
      : [];
  } catch {
    return [];
  }
}

/** The site's glyph for the tool, repainted in the theme's text colour. */
function toolIcon(tool: CatalogTool) {
  return { source: tool.icon, tintColor: Color.PrimaryText };
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

/** Markdown for the result view: the output verbatim in a fenced block. */
/**
 * `text` in a fenced block longer than any backtick run inside it, so neither
 * output nor an error message — which can echo a fragment of the input — is
 * ever read as Markdown. A loop, not `Math.max(...runs)`: a large code-like
 * output has more backtick runs than a call can take arguments.
 */
function fenced(text: string): string {
  let longest = 0;
  let run = 0;
  for (const ch of text) {
    run = ch === "`" ? run + 1 : 0;
    if (run > longest) longest = run;
  }
  const fence = "`".repeat(Math.max(3, longest + 1));
  return `${fence}\n${text}\n${fence}`;
}

function resultMarkdown(tool: CatalogTool, res: RunResult): string {
  if (res.error) return `## ${tool.name}\n\n${fenced(res.error)}`;
  return fenced(res.output ?? "");
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

/** Result of one tool, shown before anything is pasted or copied. */
function ResultView(props: {
  tool: CatalogTool;
  input: string;
  onUseAsInput: (text: string) => void;
}) {
  const { tool, input, onUseAsInput } = props;
  const [res, setRes] = useState<RunResult | undefined>();
  const { pop } = useNavigation();

  useEffect(() => {
    // Same guard as paste/copy: a transform with nothing to transform must not
    // open a blank result that offers to paste, copy or chain it.
    if (tool.mode === "transform" && !input) {
      setRes({ error: NO_INPUT });
      return;
    }
    runTool(tool, input).then(setRes);
  }, [tool, input]);

  const output = res?.output ?? "";
  return (
    <Detail
      isLoading={res === undefined}
      navigationTitle={tool.name}
      markdown={res ? resultMarkdown(tool, res) : ""}
      metadata={
        res && !res.error ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Tool"
              text={tool.name}
              icon={toolIcon(tool)}
            />
            <Detail.Metadata.Label title="Category" text={tool.category} />
            {res.tally ? (
              <Detail.Metadata.Label title="Result" text={res.tally} />
            ) : null}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Input"
              text={`${input.length} chars`}
            />
            <Detail.Metadata.Label
              title="Output"
              text={`${output.length} chars`}
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        res && !res.error ? (
          <ActionPanel>
            <Action.Paste title="Paste Result to App" content={output} />
            <Action.CopyToClipboard
              title="Copy Result to Clipboard"
              content={output}
            />
            <Action
              title="Use Result as Input"
              icon={Icon.ArrowRight}
              shortcut={USE_AS_INPUT}
              onAction={() => {
                onUseAsInput(output);
                pop();
              }}
            />
            <Action.OpenInBrowser
              title="Open on Textarray.com"
              url={toolUrl(tool, input)}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

export default function Command() {
  const [input, setInput] = useState<string>("");
  const [loadingInput, setLoadingInput] = useState(true);
  const [pinned, setPinned] = useState<string[]>([]);

  useEffect(() => {
    readInput()
      .then(setInput)
      .finally(() => setLoadingInput(false));
    readPinned().then(setPinned);
  }, []);

  const sections = useMemo(() => groupByCategory(catalog), []);
  const pinnedTools = useMemo(
    () =>
      pinned
        .map((slug) => catalog.find((t) => t.slug === slug))
        .filter((t): t is CatalogTool => t !== undefined),
    [pinned],
  );

  async function togglePin(tool: CatalogTool) {
    const next = pinned.includes(tool.slug)
      ? pinned.filter((s) => s !== tool.slug)
      : [...pinned, tool.slug];
    setPinned(next);
    await LocalStorage.setItem(PINNED_KEY, JSON.stringify(next));
    await showToast({
      style: Toast.Style.Success,
      title: next.includes(tool.slug) ? "Pinned" : "Unpinned",
      message: tool.name,
    });
  }

  /** Runs the tool, or explains why it can't. Undefined means "stop here". */
  async function result(tool: CatalogTool): Promise<RunResult | undefined> {
    if (tool.mode === "transform" && !input) {
      await showToast({
        style: Toast.Style.Failure,
        title: NO_INPUT,
      });
      return undefined;
    }
    const res = await runTool(tool, input);
    if (res.error) {
      await showToast({
        style: Toast.Style.Failure,
        title: tool.name,
        message: res.error,
      });
      return undefined;
    }
    return res;
  }

  async function paste(tool: CatalogTool) {
    const res = await result(tool);
    if (!res) return;
    await Clipboard.paste(res.output ?? "");
    await closeMainWindow();
    await showHUD(res.tally ? `Pasted · ${res.tally}` : "Pasted");
  }

  async function copy(tool: CatalogTool) {
    const res = await result(tool);
    if (!res) return;
    await Clipboard.copy(res.output ?? "");
    await closeMainWindow();
    await showHUD(res.tally ? `Copied · ${res.tally}` : "Copied");
  }

  async function useAsInput(tool: CatalogTool) {
    const res = await result(tool);
    if (!res) return;
    setInput(res.output ?? "");
    await showToast({
      style: Toast.Style.Success,
      title: "Result is now the input",
      message: res.tally || `${(res.output ?? "").length} chars`,
    });
  }

  function item(tool: CatalogTool, section: string) {
    const isPinned = pinned.includes(tool.slug);
    return (
      <List.Item
        key={`${section}:${tool.slug}`}
        title={tool.name}
        subtitle={tool.mode === "generate" ? "generator" : undefined}
        keywords={[tool.slug, tool.category]}
        icon={toolIcon(tool)}
        accessories={
          isPinned && section !== "pinned"
            ? [{ icon: Icon.Pin, tooltip: "Pinned" }]
            : undefined
        }
        actions={
          <ActionPanel>
            {/* The original four, in their original order — new actions are appended after them. */}
            <ActionPanel.Section>
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
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.Push
                title="Preview Result"
                icon={Icon.Eye}
                shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
                target={
                  <ResultView
                    tool={tool}
                    input={input}
                    onUseAsInput={setInput}
                  />
                }
              />
              <Action
                title="Use Result as Input"
                icon={Icon.ArrowRight}
                shortcut={USE_AS_INPUT}
                onAction={() => useAsInput(tool)}
              />
              <Action
                title={isPinned ? "Unpin Tool" : "Pin Tool"}
                icon={isPinned ? Icon.PinDisabled : Icon.Pin}
                shortcut={Keyboard.Shortcut.Common.Pin}
                onAction={() => togglePin(tool)}
              />
              <Action.CopyToClipboard
                title="Copy Tool Link"
                content={`${SITE}/${tool.slug}`}
                shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={loadingInput}
      searchBarPlaceholder="Search 650+ text tools…"
      navigationTitle={
        input ? `TextArray · ${input.length} chars in` : "TextArray"
      }
    >
      {pinnedTools.length > 0 ? (
        <List.Section title="Pinned" subtitle={`${pinnedTools.length}`}>
          {pinnedTools.map((tool) => item(tool, "pinned"))}
        </List.Section>
      ) : null}
      {sections.map(([category, tools]) => (
        <List.Section
          key={category}
          title={category}
          subtitle={`${tools.length}`}
        >
          {tools.map((tool) => item(tool, category))}
        </List.Section>
      ))}
    </List>
  );
}
