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
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { access, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { useCallback, useEffect, useState } from "react";

const execFileAsync = promisify(execFile);

// Width of the mermaid.ink PNG. Larger = sharper on Retina, scaled down to fit the Detail pane.
const RENDER_WIDTH = 1400;

// Device-scale factor for the local mmdc render. mmdc's --width only sets the
// page width (no upscaling), so --scale is what makes the PNG sharp on Retina.
const MMDC_SCALE = 3;

// Diagram-type keywords every Mermaid source begins with. Used to tell Mermaid
// from LaTeX: if the first meaningful line starts with one of these, it's Mermaid;
// otherwise the clipboard is treated as a LaTeX math snippet.
const MERMAID_KEYWORDS = new Set([
  "graph",
  "flowchart",
  "sequencediagram",
  "classdiagram",
  "classdiagram-v2",
  "statediagram",
  "statediagram-v2",
  "erdiagram",
  "journey",
  "gantt",
  "pie",
  "quadrantchart",
  "requirementdiagram",
  "gitgraph",
  "mindmap",
  "timeline",
  "zenuml",
  "sankey",
  "sankey-beta",
  "xychart",
  "xychart-beta",
  "block",
  "block-beta",
  "packet",
  "packet-beta",
  "kanban",
  "architecture",
  "architecture-beta",
  "radar",
  "radar-beta",
  "treemap",
  "treemap-beta",
  "info",
  "c4context",
  "c4container",
  "c4component",
  "c4dynamic",
  "c4deployment",
]);

function looksLikeMermaid(code: string): boolean {
  let lines = code.split(/\r?\n/);
  // Drop a leading YAML frontmatter block (--- ... ---) if present.
  if (lines[0]?.trim() === "---") {
    const end = lines.findIndex((line, i) => i > 0 && line.trim() === "---");
    if (end !== -1) {
      lines = lines.slice(end + 1);
    }
  }
  for (const raw of lines) {
    const line = raw.trim();
    // Skip blank lines, comments, and %%{init}%% directives.
    if (!line || line.startsWith("%%")) {
      continue;
    }
    const token = line.match(/^[A-Za-z][\w-]*/)?.[0]?.toLowerCase();
    return token !== undefined && MERMAID_KEYWORDS.has(token);
  }
  return false;
}

// Raycast renders the snippet in math mode itself ($$...$$), so strip any
// surrounding math delimiters the user may have copied along with the formula.
function stripMathDelimiters(input: string): string {
  const s = input.trim();
  const pairs: [string, string][] = [
    ["$$", "$$"],
    ["\\[", "\\]"],
    ["\\(", "\\)"],
    ["$", "$"],
  ];
  for (const [open, close] of pairs) {
    if (
      s.length >= open.length + close.length &&
      s.startsWith(open) &&
      s.endsWith(close)
    ) {
      return s.slice(open.length, s.length - close.length).trim();
    }
  }
  return s;
}

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

function mermaidInkUrl(payload: string): string {
  return `https://mermaid.ink/img/${payload}?type=png&width=${RENDER_WIDTH}`;
}

function mermaidLiveUrl(payload: string): string {
  return `https://mermaid.live/edit#${payload}`;
}

// Raycast spawns the extension with a minimal PATH that lacks node and any
// PATH-managed installs (nodenv/nvm shims, Homebrew). Running through the user's
// login shell reproduces the PATH they get in a terminal — needed both to find
// mmdc and to run it, since mmdc is an `env node` script.
const LOGIN_SHELL = process.env.SHELL || "/bin/zsh";

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function loginShell(command: string, timeout: number): Promise<string> {
  const { stdout } = await execFileAsync(LOGIN_SHELL, ["-lic", command], {
    timeout,
  });
  return stdout;
}

// Memoized per process (each command launch is a fresh process). undefined = not
// yet checked, null = looked but not found, string = absolute path to mmdc.
let detectedMermaidCli: string | null | undefined;
async function detectMermaidCli(): Promise<string | null> {
  if (detectedMermaidCli !== undefined) {
    return detectedMermaidCli;
  }
  detectedMermaidCli =
    (await mermaidCliOnPath()) ?? (await mermaidCliInNpmPrefix()) ?? null;
  return detectedMermaidCli;
}

// mmdc resolvable on PATH (Homebrew, or a rehashed nodenv/nvm shim).
async function mermaidCliOnPath(): Promise<string | null> {
  try {
    const path = (await loginShell("command -v mmdc", 8_000))
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("/") && line.endsWith("mmdc"))
      .pop();
    return path ?? null;
  } catch {
    return null;
  }
}

// mmdc installed globally but not yet on PATH (e.g. nodenv before a rehash):
// look in npm's global bin directory.
async function mermaidCliInNpmPrefix(): Promise<string | null> {
  try {
    const prefix = (await loginShell("npm prefix -g", 8_000)).trim();
    if (!prefix.startsWith("/")) {
      return null;
    }
    const candidate = join(prefix, "bin", "mmdc");
    await access(candidate);
    return candidate;
  } catch {
    return null;
  }
}

// Render a Mermaid diagram locally with mmdc (@mermaid-js/mermaid-cli). Nothing
// leaves the machine. The absolute path is run back through the login shell
// because mmdc is an `env node` script and Raycast's PATH doesn't include node.
async function renderMermaidLocally(
  code: string,
  theme: string,
  cliPath: string,
): Promise<Buffer> {
  // Unique per render so overlapping runs (e.g. a quick Reload while a slow mmdc
  // is still going) never read or overwrite each other's files, and a missing
  // output always means this run failed rather than a stale image being served.
  const id = randomUUID();
  const inputPath = join(environment.supportPath, `mmdc-${id}.mmd`);
  const outputPath = join(environment.supportPath, `mmdc-${id}.png`);
  try {
    await writeFile(inputPath, code, "utf8");
    const command = [
      cliPath,
      "--input",
      inputPath,
      "--output",
      outputPath,
      "--theme",
      theme,
      "--backgroundColor",
      "transparent",
      "--scale",
      String(MMDC_SCALE),
    ]
      .map(shellQuote)
      .join(" ");
    await loginShell(command, 60_000);
    // `await` before the finally runs, so cleanup can't delete the file mid-read.
    return await readFile(outputPath);
  } finally {
    await rm(inputPath, { force: true });
    await rm(outputPath, { force: true });
  }
}

// Save image bytes to a content-hashed file and return its file:// URL, so the
// Detail pane never serves a stale image from a colliding name. supportPath
// contains a space ("Application Support"), so a file:// URL is required.
async function saveImage(
  buffer: Buffer,
): Promise<{ imagePath: string; fileUrl: string }> {
  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  const imagePath = join(environment.supportPath, `render-${hash}.png`);
  await writeFile(imagePath, buffer);
  return { imagePath, fileUrl: pathToFileURL(imagePath).href };
}

function renderErrorMarkdown(
  serviceLabel: string,
  message: string,
  code: string,
  fence: string,
): string {
  return [
    "# Could not render",
    "",
    `The clipboard content could not be rendered by ${serviceLabel}:`,
    "",
    "```",
    message,
    "```",
    "",
    "## Clipboard content",
    "",
    "```" + fence,
    code,
    "```",
  ].join("\n");
}

type RenderContext = {
  theme: string;
  mermaidCliPath?: string;
};

// What a renderer hands back to the view. A renderer reports its own failures by
// setting `failure` (and a friendly error `markdown`) rather than throwing, so
// useful actions (Copy Source, Open in Editor) stay available on the error view.
type RenderOutput = {
  markdown: string;
  source: string;
  imagePath?: string;
  imageUrl?: string;
  editorUrl?: string;
  failure?: unknown;
};

// A clipboard format the command can render. Add a new format by appending a
// Renderer here: a `matches` detector plus a `render` step. Order matters —
// the first matching renderer wins, so keep the catch-all (LaTeX) last.
type Renderer = {
  id: string;
  matches: (code: string) => boolean;
  render: (code: string, ctx: RenderContext) => Promise<RenderOutput>;
};

const mermaidRenderer: Renderer = {
  id: "mermaid",
  matches: (code) => looksLikeMermaid(code),
  async render(code, ctx) {
    const payload = encodePako(code, ctx.theme);
    const editorUrl = mermaidLiveUrl(payload);
    // Render on-device with mmdc when available (an explicit path wins, else
    // auto-detect); only fall back to mermaid.ink when no local binary exists.
    const explicitCli = ctx.mermaidCliPath?.trim() || undefined;
    const localCli = explicitCli ?? (await detectMermaidCli()) ?? undefined;

    try {
      let buffer: Buffer;
      let imageUrl: string | undefined;
      if (localCli) {
        buffer = await renderMermaidLocally(code, ctx.theme, localCli);
      } else {
        imageUrl = mermaidInkUrl(payload);
        const response = await fetch(imageUrl);
        if (!response.ok) {
          // mermaid.ink returns the parse error in the body on 4xx/5xx.
          const detail = (await response.text()).trim();
          throw new Error(
            detail || `mermaid.ink responded with ${response.status}`,
          );
        }
        buffer = Buffer.from(await response.arrayBuffer());
      }

      const { imagePath, fileUrl } = await saveImage(buffer);
      // No mmdc found: the diagram went to mermaid.ink. Warn so it's never a
      // silent egress, and point at the local-rendering fix.
      const notice = localCli
        ? ""
        : "\n\n---\n\n> ⚠️ No local Mermaid CLI found, so this diagram was rendered by **mermaid.ink** (it left your machine). Install [`mmdc`](https://github.com/mermaid-js/mermaid-cli) (`npm i -g @mermaid-js/mermaid-cli`) for fully local rendering.";
      return {
        markdown: `![Mermaid diagram](${fileUrl})${notice}`,
        source: code,
        imagePath,
        imageUrl,
        editorUrl,
      };
    } catch (error) {
      let message = error instanceof Error ? error.message : String(error);
      // execFile rejections carry the binary's diagnostics on `stderr`.
      const stderr = (error as { stderr?: string | Buffer }).stderr;
      if (stderr) {
        message = `${message}\n${stderr.toString().trim()}`;
      }
      return {
        markdown: renderErrorMarkdown(
          localCli ? `the local Mermaid CLI (\`${localCli}\`)` : "mermaid.ink",
          message,
          code,
          "mermaid",
        ),
        source: code,
        editorUrl,
        failure: error,
      };
    }
  },
};

const latexRenderer: Renderer = {
  id: "latex",
  // Catch-all fallback: anything that isn't another known format is treated as a
  // LaTeX math snippet. Keep this LAST in RENDERERS.
  matches: () => true,
  async render(code) {
    // Raycast's Detail markdown renders LaTeX natively (since API 1.81), so a
    // math snippet needs no service and no image — just emit it as display
    // math. This is fully local and works offline.
    return { markdown: `$$\n${stripMathDelimiters(code)}\n$$`, source: code };
  },
};

const RENDERERS: Renderer[] = [mermaidRenderer, latexRenderer];

interface RenderState {
  isLoading: boolean;
  markdown: string;
  imagePath?: string;
  imageUrl?: string;
  editorUrl?: string;
  source?: string;
}

export default function RenderFromClipboard() {
  const { theme, mermaidCliPath } = getPreferenceValues<Preferences>();
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
          "# Nothing to render\n\nCopy some Mermaid code or a LaTeX math expression to the clipboard, then run this command again.",
      });
      return;
    }

    const ctx: RenderContext = { theme: resolveTheme(theme), mermaidCliPath };
    const renderer = RENDERERS.find((r) => r.matches(code)) ?? latexRenderer;

    try {
      const { failure, ...output } = await renderer.render(code, ctx);
      if (failure) {
        await showFailureToast(failure, { title: "Failed to render" });
      }
      setState({ isLoading: false, ...output });
    } catch (error) {
      // Safety net for an unexpected throw a renderer didn't handle itself.
      await showFailureToast(error, { title: "Failed to render" });
      setState({
        isLoading: false,
        markdown: renderErrorMarkdown(
          "the renderer",
          error instanceof Error ? error.message : String(error),
          code,
          "",
        ),
        source: code,
      });
    }
  }, [theme, mermaidCliPath]);

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
