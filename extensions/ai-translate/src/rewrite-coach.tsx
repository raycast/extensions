import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  LaunchProps,
  Toast,
  getSelectedText,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { getMaxOutputTokens, getProviderConfig, getTimeoutMs, readPreferences } from "./preferences";
import { buildRewriteCoachPrompt } from "./prompt";
import { MissingAPIKeyError, generateWithGemini } from "./providers";
import { speakText } from "./tts";

interface CoachResult {
  rewritten: string;
  why: string;
}

export default function Command(props: LaunchProps) {
  const preferences = useMemo(() => readPreferences(), []);
  const [original, setOriginal] = useState<string>();
  const [result, setResult] = useState<CoachResult>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [runId, setRunId] = useState(0);
  const requestSequence = useRef(0);

  useEffect(() => {
    let isMounted = true;

    async function setup() {
      const launchText = normalizeInputText(props.fallbackText ?? "");
      if (launchText) {
        if (isMounted) setOriginal(launchText);
        return;
      }

      try {
        const selectedText = normalizeInputText(await getSelectedText());
        if (isMounted) setOriginal(selectedText);
      } catch {
        if (isMounted) setOriginal("");
      }
    }

    void setup();
    return () => {
      isMounted = false;
    };
  }, [props.fallbackText]);

  useEffect(() => {
    if (original === undefined) return;

    const sequence = ++requestSequence.current;

    if (!original) {
      setResult(undefined);
      setError(undefined);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(undefined);
    void runCoach(original, sequence);
  }, [original, runId]);

  async function runCoach(text: string, sequence: number) {
    const config = getProviderConfig("gemini", preferences);
    try {
      const raw = await generateWithGemini(
        config,
        buildRewriteCoachPrompt(text),
        getTimeoutMs(preferences),
        getMaxOutputTokens(preferences),
      );
      if (sequence !== requestSequence.current) return;
      setResult(parseCoachResponse(raw));
    } catch (caught) {
      if (sequence !== requestSequence.current) return;
      const message =
        caught instanceof MissingAPIKeyError
          ? "Add a Gemini API key in Extension Preferences."
          : caught instanceof Error
            ? caught.message
            : String(caught);
      setResult(undefined);
      setError(message);
      await showToast({ style: Toast.Style.Failure, title: "Rewrite failed", message: message.slice(0, 120) });
    } finally {
      if (sequence === requestSequence.current) setIsLoading(false);
    }
  }

  function regenerate() {
    setRunId((value) => value + 1);
  }

  const rewritten = result?.rewritten ?? "";
  const markdown = buildMarkdown({ original, result, error, isLoading });

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Rewrite & Coach"
      markdown={markdown}
      actions={
        <ActionPanel>
          {rewritten && (
            <ActionPanel.Section>
              <Action.Paste
                content={rewritten}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                title="Paste Rewritten Text"
              />
              <Action.CopyToClipboard content={rewritten} title="Copy Rewritten Text" />
              <Action
                icon={Icon.SpeakerOn}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                title="Read Rewritten Aloud"
                onAction={() => void speakText(rewritten)}
              />
              <Action
                icon={Icon.SpeakerOn}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                title="Read Original Aloud"
                onAction={() => void speakText(original ?? "")}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              title="Regenerate"
              onAction={regenerate}
            />
            {original ? (
              <Action.CopyToClipboard
                content={original}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                title="Copy Original Text"
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section title="Settings">
            <Action icon={Icon.Gear} title="Extension Preferences" onAction={openExtensionPreferences} />
            {error ? (
              <Action
                icon={Icon.ExclamationMark}
                title="Show Error"
                onAction={() => showToast({ style: Toast.Style.Failure, title: "Rewrite & Coach", message: error })}
              />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function buildMarkdown(state: {
  original: string | undefined;
  result: CoachResult | undefined;
  error: string | undefined;
  isLoading: boolean;
}): string {
  const { original, result, error, isLoading } = state;

  if (original === undefined) {
    return "Reading selected text…";
  }

  if (!original) {
    return [
      "## No text selected",
      "",
      "Select text in any app, then run **Rewrite & Coach** (assign a global hotkey to this command in Raycast).",
    ].join("\n");
  }

  const sections: string[] = [];

  if (result?.rewritten) {
    sections.push("## ✨ Rewritten", "", result.rewritten);
  } else if (isLoading) {
    sections.push("## ✨ Rewritten", "", "_Rewriting and coaching…_");
  } else if (error) {
    sections.push("## ⚠️ Error", "", error);
  }

  sections.push("", "## 📝 Original", "", quoted(original));

  if (result?.why) {
    sections.push("", "## 💡 为什么这样更自然", "", result.why);
  }

  return sections.join("\n");
}

function parseCoachResponse(raw: string): CoachResult {
  const candidates = [raw.trim(), stripCodeFence(raw), extractJsonObject(raw)];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate) as { rewritten?: unknown; why?: unknown };
      const rewritten = typeof parsed.rewritten === "string" ? parsed.rewritten.trim() : "";
      const why = typeof parsed.why === "string" ? parsed.why.trim() : "";
      if (rewritten) {
        return { rewritten, why };
      }
    } catch {
      // Try the next candidate representation.
    }
  }

  return { rewritten: raw.trim(), why: "" };
}

function stripCodeFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start !== -1 && end > start ? text.slice(start, end + 1) : "";
}

function normalizeInputText(text: string | undefined): string {
  return (text ?? "").replace(/\r\n/g, "\n").trim().slice(0, 12000);
}

function quoted(text: string): string {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}
