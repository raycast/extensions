import { Action, ActionPanel, Detail, Icon, getPreferenceValues } from "@raycast/api";
import { useMemo } from "react";
import { ArticleState } from "../types/article";
import { useRSVPPlayer } from "../hooks/useRSVPPlayer";
import { useAudioSynthesis } from "../hooks/useAudioSynthesis";
import { ParagraphPause } from "../rsvp/timing";
import { splitAtORP } from "../rsvp/orp";
import { PARAGRAPH_BREAK, IMAGE_PLACEHOLDER, tokenize } from "../rsvp/tokenize";

interface Props {
  article: ArticleState;
}

interface RSVPPrefs {
  wpm?: string;
  voice?: string;
  enableTTS?: boolean;
  paragraphPause?: ParagraphPause;
}

// H1 chars in Raycast Detail are roughly 1.7× the width of body chars. Bump up
// if the focal letter sits left of the arrows, down if it sits right.
const H1_TO_BODY_RATIO = 1.7;
// Fixed body-text column for the ▼/▲ markers. The word slides left/right under
// these markers so the ORP letter always lines up beneath them.
const ORP_CENTER_COL = 30;

function parseWpm(raw: string | undefined, fallback = 320): number {
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  if (isNaN(n)) return fallback;
  return Math.max(80, Math.min(800, n));
}

function progressBar(pct: number, width = 24): string {
  const filled = Math.round((pct / 100) * width);
  return "▓".repeat(filled) + "░".repeat(Math.max(0, width - filled));
}

function escapeMd(s: string): string {
  return s.replace(/([\\`*_{}[\]()#+\-.!|<>])/g, "\\$1");
}

/**
 * Render the current word as an H1 (big text) with classic-RSVP ▼/▲ arrows.
 * The arrows are fixed at column ORP_CENTER_COL; the word slides left/right
 * under them so the focal letter always sits beneath the markers.
 */
function renderRSVPCenter(word: string): string {
  const arrowPad = "&nbsp;".repeat(ORP_CENTER_COL);
  if (word === PARAGRAPH_BREAK) {
    const lead = Math.max(0, Math.round(ORP_CENTER_COL / H1_TO_BODY_RATIO - 0.5));
    return [`${arrowPad}▼`, "", `# ${"&nbsp;".repeat(lead)}¶`, "", `${arrowPad}▲`].join("\n");
  }
  const { before, focus, after } = splitAtORP(word);
  const h1Lead = Math.max(0, Math.round(ORP_CENTER_COL / H1_TO_BODY_RATIO - before.length - 0.5));
  const wordLine = `# ${"&nbsp;".repeat(h1Lead)}${escapeMd(before)}**${escapeMd(focus)}**${escapeMd(after)}`;
  return [`${arrowPad}▼`, "", wordLine, "", `${arrowPad}▲`].join("\n");
}

export function RSVPView({ article }: Props) {
  const prefs = getPreferenceValues<RSVPPrefs>();
  const initialWpm = parseWpm(prefs.wpm);
  const paragraphPause = (prefs.paragraphPause ?? "short") as ParagraphPause;
  const ttsEnabledPref = prefs.enableTTS !== false;
  const voice = prefs.voice ?? "";

  const articleMarkdown = useMemo(() => {
    return `# ${article.title}\n\n${article.bodyMarkdown}`;
  }, [article.title, article.bodyMarkdown]);

  const { sentences, words } = useMemo(() => tokenize(articleMarkdown), [articleMarkdown]);

  const synthesis = useAudioSynthesis(sentences, {
    voice,
    wpm: initialWpm,
    enabled: ttsEnabledPref,
  });

  const player = useRSVPPlayer({
    sentences,
    words,
    audioByIndex: synthesis.audioByIndex,
    initialWpm,
    initialTtsEnabled: ttsEnabledPref,
    paragraphPause,
  });

  const { globalWordIndex, sentenceIndex, isPlaying, isFinished, wpm, ttsEnabled } = player;
  const currentWord = words[Math.min(globalWordIndex, words.length - 1)] ?? "";
  const currentSentence = sentences[sentenceIndex];
  const totalWords = words.length;
  const pct = totalWords === 0 ? 0 : Math.min(100, Math.floor((globalWordIndex / totalWords) * 100));

  const synthPct = synthesis.total === 0 ? 100 : Math.round((synthesis.ready / synthesis.total) * 100);
  const synthLine =
    ttsEnabledPref && !synthesis.isComplete
      ? `🎙 Generating audio… ${synthesis.ready}/${synthesis.total} (${synthPct}%)`
      : ttsEnabledPref
        ? `🎙 Audio ready (${synthesis.ready} chunks)`
        : "🔇 TTS disabled (visual-only)";

  const status = isFinished
    ? "✅ Finished"
    : isPlaying
      ? "▶ Playing"
      : globalWordIndex === 0
        ? "Press ⌘P to start"
        : "⏸ Paused";

  const isImageWord = currentSentence?.image && currentWord === IMAGE_PLACEHOLDER;

  let centerBlock: string;
  let previewLine: string;

  if (isImageWord && currentSentence?.image) {
    centerBlock = `![${currentSentence.altText ?? "image"}](${currentSentence.image})`;
    previewLine = currentSentence.altText ? `📷 *${currentSentence.altText}*` : "📷 *image*";
  } else {
    centerBlock = renderRSVPCenter(currentWord);
    const txt = currentSentence?.text ?? "";
    previewLine =
      currentSentence && currentSentence.text !== PARAGRAPH_BREAK
        ? txt.length > 280
          ? txt.slice(0, 280) + "…"
          : txt
        : "*(paragraph break)*";
  }

  const markdown = `
&nbsp;

${centerBlock}

&nbsp;

> ${previewLine}

&nbsp;

\`${progressBar(pct)}\` ${pct}% — chunk ${sentenceIndex + 1}/${sentences.length}

${status} • ${wpm} WPM • TTS ${ttsEnabled ? "on" : "off"}

${synthLine}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={article.title}
      isLoading={ttsEnabledPref && !synthesis.isComplete && synthesis.ready === 0}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Playback">
            <Action
              title={isPlaying ? "Pause" : "Play"}
              icon={isPlaying ? Icon.Pause : Icon.Play}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
              onAction={player.toggle}
            />
            <Action
              title="Restart"
              icon={Icon.ArrowCounterClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={player.restart}
            />
            <Action
              title="Next Sentence"
              icon={Icon.ArrowRight}
              shortcut={{ modifiers: ["cmd", "shift"], key: "arrowRight" }}
              onAction={player.nextSentence}
            />
            <Action
              title="Previous Sentence"
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: ["cmd", "shift"], key: "arrowLeft" }}
              onAction={player.prevSentence}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Speed">
            <Action
              title="Faster (+25 WPM)"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "]" }}
              onAction={() => player.setWpm(wpm + 25)}
            />
            <Action
              title="Slower (−25 WPM)"
              icon={Icon.Minus}
              shortcut={{ modifiers: ["cmd"], key: "[" }}
              onAction={() => player.setWpm(wpm - 25)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Modes">
            <Action
              title={ttsEnabled ? "Mute TTS (Visual Only)" : "Unmute TTS"}
              icon={ttsEnabled ? Icon.SpeakerOff : Icon.SpeakerOn}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={() => player.setTtsEnabled(!ttsEnabled)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Source">
            <Action.OpenInBrowser url={article.url} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            <Action.CopyToClipboard
              title="Copy Article Markdown"
              content={articleMarkdown}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
