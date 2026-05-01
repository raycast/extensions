import {
  Action,
  ActionPanel,
  Detail,
  Form,
  showToast,
  Toast,
  Icon,
  useNavigation,
  Clipboard,
  getPreferenceValues,
} from "@raycast/api";
import { useAI } from "@raycast/utils";
import { useState, useEffect } from "react";
import { humanifyPhase1, humanifyFinalize } from "./lib/humanify";
import type { HumanifierResult } from "./lib/types";

// ── Result View ─────────────────────────────────────────────────────────────

function ResultView({ result }: { result: HumanifierResult }) {
  const changesSummary =
    result.changes.length > 0
      ? result.changes
          .slice(0, 15)
          .map((c) => {
            if (c.type === "deletion") return `- ~~${c.original.trim()}~~`;
            if (c.type === "insertion") return `- + *${c.replacement.trim()}*`;
            return `- ~~${c.original.trim()}~~ → **${c.replacement.trim()}**`;
          })
          .join("\n")
      : "*No changes needed — text already sounds human!*";

  const statsBlock = [
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Phrases replaced | ${result.stats.phase1.phrasesReplaced} |`,
    `| Buzzwords fixed | ${result.stats.phase1.buzzwordsReplaced} |`,
    `| Contractions applied | ${result.stats.phase1.contractionsApplied} |`,
    `| Total changes | ${result.changes.length} |`,
  ].join("\n");

  const markdown = `# ✨ Humanified Text

${result.final}

---

## 📊 Stats

${statsBlock}

---

## 🔄 Changes

${changesSummary}${result.changes.length > 15 ? `\n\n*...and ${result.changes.length - 15} more changes*` : ""}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={result.final} icon={Icon.Clipboard} />
          <Action.Paste title="Paste Result" content={result.final} icon={Icon.Document} />
          <Action.CopyToClipboard
            title="Copy Original"
            content={result.original}
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

// ── AI Rewrite View (streams the LLM result using useAI) ────────────────────

function AIRewriteView({
  originalText,
  prompt,
  creativity,
  phase1Stats,
}: {
  originalText: string;
  prompt: string;
  creativity: number;
  phase1Stats: { phrasesReplaced: number; buzzwordsReplaced: number; contractionsApplied: number };
}) {
  const { push } = useNavigation();
  const [hasFinalized, setHasFinalized] = useState(false);

  const { data, isLoading } = useAI(prompt, {
    creativity,
    stream: true,
    onError: async (error) => {
      await showToast({
        style: Toast.Style.Failure,
        title: "AI Rewrite Failed",
        message: error.message,
      });
    },
  });

  // Issue #2 fix: move side-effect into useEffect to prevent double-navigation
  useEffect(() => {
    if (!isLoading && data && !hasFinalized) {
      setHasFinalized(true);
      const result = humanifyFinalize(originalText, data, phase1Stats);
      push(<ResultView result={result} />);
    }
  }, [isLoading, data, hasFinalized]);

  const markdown = isLoading ? `# ✍️ Rewriting...\n\n${data || "*Waiting for AI...*"}` : `# ✨ Done!\n\n${data || ""}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        !isLoading && data ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Result" content={data} icon={Icon.Clipboard} />
            <Action.Paste title="Paste Result" content={data} icon={Icon.Document} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

// ── Main Command ────────────────────────────────────────────────────────────

export default function Command() {
  // Issue #1 fix: use auto-generated Preferences type from raycast-env.d.ts
  const { defaultIntensity } = getPreferenceValues<Preferences.Humanify>();
  const { push } = useNavigation();

  async function handleSubmit(values: { text: string; intensity: string }) {
    const text = values.text.trim();
    if (!text) {
      await showToast({ style: Toast.Style.Failure, title: "Please enter some text" });
      return;
    }

    const intensity = values.intensity as "clean" | "rewrite" | "strip";
    const p1 = humanifyPhase1(text, intensity);

    // Issue #3 fix: always run LLM — Phase 1 may miss subtle AI patterns
    push(<AIRewriteView originalText={text} prompt={p1.prompt} creativity={p1.creativity} phase1Stats={p1.stats} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Humanify" icon={Icon.Wand} onSubmit={handleSubmit} />
          <Action
            title="Paste from Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={async () => {
              const clipboardText = await Clipboard.readText();
              if (clipboardText) {
                await handleSubmit({ text: clipboardText, intensity: defaultIntensity });
              } else {
                await showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="AI Text"
        placeholder="Paste your AI-generated text here..."
        enableMarkdown={false}
      />
      <Form.Dropdown id="intensity" title="Intensity" defaultValue={defaultIntensity}>
        <Form.Dropdown.Item value="clean" title="🧹 Clean — Fix worst AI-isms only" />
        <Form.Dropdown.Item value="rewrite" title="✍️ Rewrite — Restructure sentences" />
        <Form.Dropdown.Item value="strip" title="🔥 Strip — Very terse and direct" />
      </Form.Dropdown>
    </Form>
  );
}
