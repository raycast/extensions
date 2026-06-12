import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  getPreferenceValues,
  getSelectedText,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import removeMd from "remove-markdown";
import { addHistoryEntry } from "./lib/history";

interface Preferences {
  apiKey: string;
}

interface Segment {
  text: string;
  label: string;
  start_index: number;
  end_index: number;
  confidence: string;
}

interface PangramResult {
  stage: string;
  headline: string;
  prediction: string;
  fraction_ai: number;
  fraction_ai_assisted: number;
  fraction_human: number;
  windows: Segment[];
}

const PANGRAM_API = "https://text.external-api.pangram.com";
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 30;

async function submitTask(text: string, apiKey: string): Promise<string> {
  const res = await fetch(`${PANGRAM_API}/task`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ text, public_dashboard_link: false }),
  });
  if (!res.ok) throw new Error(`Submission failed (${res.status})`);
  const data = (await res.json()) as { task_id: string };
  return data.task_id;
}

async function pollTask(taskId: string, apiKey: string): Promise<PangramResult> {
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const res = await fetch(`${PANGRAM_API}/task/${taskId}`, {
      headers: { "x-api-key": apiKey },
    });
    if (!res.ok) throw new Error(`Poll failed (${res.status})`);
    const data = (await res.json()) as PangramResult;
    if (data.stage === "STAGE_SUCCESS") return data;
    if (data.stage === "STAGE_FAILED") throw new Error("Pangram analysis failed");
  }
  throw new Error("Timed out waiting for analysis result");
}

/**
 * Strip HTML tags and all Markdown formatting so Pangram receives clean prose.
 * The window indices in the response will then map cleanly back to this text.
 */
function toPlainText(raw: string): string {
  // removeMd handles: HTML tags, headings, bold/italic, code blocks,
  // blockquotes, list markers, links, images, strikethrough
  return removeMd(raw, {
    stripListLeaders: true,
    gfm: true,
    useImgAltText: false,
  })
    .replace(/\n{3,}/g, "\n\n") // collapse excess blank lines
    .replace(/[ \t]+/g, " ") // collapse inline whitespace
    .replace(/^ | $/gm, "") // trim each line
    .trim();
}

/** Escape characters that would break inline markdown in Raycast's renderer */
function escapeMarkdown(text: string): string {
  return text.replace(/[\\*_`[\]#<]/g, "\\$&");
}

/**
 * Wrap a segment with a markdown marker, applying it line-by-line so it
 * renders correctly even when segments span multiple lines.
 * (CommonMark bold/italic doesn't render across line breaks.)
 */
function wrapLines(segment: string, wrap: (line: string) => string): string {
  return segment
    .split("\n")
    .map((line) => (line.trim() ? wrap(line) : line))
    .join("\n");
}

/**
 * Rebuild text with per-segment inline annotations.
 *   AI-Generated  → **bold** (per line)
 *   AI-Assisted   → _italic_ (per line)
 *   Human-Written → plain
 */
function buildMeter(human: number, aiAssisted: number, ai: number): string {
  const TOTAL_BLOCKS = 20;
  const humanBlocks = Math.round(human * TOTAL_BLOCKS);
  const assistedBlocks = Math.round(aiAssisted * TOTAL_BLOCKS);
  const aiBlocks = TOTAL_BLOCKS - humanBlocks - assistedBlocks;

  const bar =
    "🟩".repeat(Math.max(0, humanBlocks)) +
    "🟨".repeat(Math.max(0, assistedBlocks)) +
    "🟥".repeat(Math.max(0, aiBlocks));

  const pct = (n: number) => `**${(n * 100).toFixed(1)}%**`;

  return [
    bar,
    "",
    `| 🟩 Human | 🟨 AI-Assisted | 🟥 AI-Generated |`,
    `| :---: | :---: | :---: |`,
    `| ${pct(human)} | ${pct(aiAssisted)} | ${pct(ai)} |`,
  ].join("\n");
}

function buildAnnotatedText(text: string, windows: Segment[]): string {
  if (!windows?.length) {
    return text.split("\n").map(escapeMarkdown).join("\n");
  }

  const sorted = [...windows].sort((a, b) => a.start_index - b.start_index);
  let result = "";
  let pos = 0;

  for (const win of sorted) {
    if (win.start_index > pos) {
      result += text.slice(pos, win.start_index).split("\n").map(escapeMarkdown).join("\n");
    }

    const raw = text.slice(win.start_index, win.end_index);
    if (win.label === "AI-Generated") {
      result += wrapLines(raw, (line) => `**${escapeMarkdown(line)}**`);
    } else if (win.label === "AI-Assisted") {
      result += wrapLines(raw, (line) => `_${escapeMarkdown(line)}_`);
    } else {
      result += raw.split("\n").map(escapeMarkdown).join("\n");
    }

    pos = win.end_index;
  }

  if (pos < text.length) {
    result += text.slice(pos).split("\n").map(escapeMarkdown).join("\n");
  }
  return result;
}

function buildResultMarkdown(result: PangramResult, text: string): string {
  const meter = buildMeter(result.fraction_human, result.fraction_ai_assisted, result.fraction_ai);
  const annotated = buildAnnotatedText(text, result.windows);

  return [
    `## ${result.headline}`,
    "",
    `> ${result.prediction}`,
    "",
    "---",
    "",
    meter,
    "",
    "---",
    "",
    "### Annotated Text",
    "",
    "> **Bold** = AI-Generated · _Italic_ = AI-Assisted · Plain = Human",
    "",
    annotated,
  ].join("\n");
}

type Phase = "loading" | "confirm" | "analyzing" | "done" | "error";

function buildConfirmMarkdown(text: string): string {
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const snippet = words.slice(0, 50).join(" ");
  const truncated = wordCount > 50;

  return [
    `## Send ${wordCount.toLocaleString()} word${wordCount === 1 ? "" : "s"} to Pangram?`,
    "",
    "**Preview:**",
    "",
    `> ${escapeMarkdown(snippet)}${truncated ? "…" : ""}`,
    "",
    "---",
    "",
    "Press **↵** to analyze, or **⎋** to cancel.",
  ].join("\n");
}

export default function Command() {
  const { apiKey } = getPreferenceValues<Preferences>();
  const [phase, setPhase] = useState<Phase>("loading");
  const [text, setText] = useState("");
  const [resultMarkdown, setResultMarkdown] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Step 1: load text from selection or clipboard
  useEffect(() => {
    async function loadText() {
      try {
        let t = "";
        try {
          t = await getSelectedText();
        } catch {
          t = (await Clipboard.readText()) ?? "";
        }

        t = toPlainText(t);
        if (!t) {
          setErrorMessage("Select or copy some text before running this command.");
          setPhase("error");
          return;
        }

        setText(t);
        setPhase("confirm");
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : String(err));
        setPhase("error");
      }
    }

    loadText();
  }, []);

  // Step 2: run analysis after user confirms
  async function analyze() {
    setPhase("analyzing");
    try {
      const taskId = await submitTask(text, apiKey);
      const result = await pollTask(taskId, apiKey);
      const md = buildResultMarkdown(result, text);
      setResultMarkdown(md);

      // Persist to history (including raw debug data)
      const words = text.split(/\s+/).filter(Boolean);
      await addHistoryEntry({
        headline: result.headline,
        wordCount: words.length,
        preview: words.slice(0, 50).join(" "),
        resultMarkdown: md,
        rawText: text,
        rawResponse: JSON.stringify(result, null, 2),
      });

      setPhase("done");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Pangram Error",
        message,
      });
      setErrorMessage(message);
      setPhase("error");
    }
  }

  if (phase === "loading") {
    return <Detail markdown="## Fetching text…" isLoading />;
  }

  if (phase === "confirm") {
    return (
      <Detail
        markdown={buildConfirmMarkdown(text)}
        actions={
          <ActionPanel>
            <Action title="Analyze with Pangram" onAction={analyze} />
          </ActionPanel>
        }
      />
    );
  }

  if (phase === "analyzing") {
    return <Detail markdown="## Analyzing…\n\nProcessing, please wait…" isLoading />;
  }

  if (phase === "error") {
    return <Detail markdown={`## No Text Found\n\n${errorMessage}`} />;
  }

  return <Detail markdown={resultMarkdown} />;
}
