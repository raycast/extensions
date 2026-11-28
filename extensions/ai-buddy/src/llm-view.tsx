import { Action, ActionPanel, Detail, Form, Icon, Keyboard, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { clipInput, dataBlock, getConfig, isInsecureEndpoint, MAX_INPUT_CHARS, modelFor, streamChat } from "./llm";
import { getCachedLookup, isLookupText, parseLookup, setCachedLookup } from "./lookup";
import { texts } from "./texts";
import { isNative, translationTarget, yourLanguage } from "./language";
import { LESSONS_MARKER, systemPrompt } from "./prompts";
import { runDraftReply } from "./launch";
import { AISetup } from "./setup-view";
import { cambridgeUrl, loadPronunciations, Pron, speak } from "./pronounce";

export type Mode = "translate" | "reply" | "rewrite";
/** Buddy Draft Reply → Reply Language (a setting of that command, read when it runs). */
export type ReplyLanguage = "match" | "english";
/** Passed from the no-view launcher; startedAt is the hotkey press time (epoch ms). */
export type LLMRequest = { mode: Mode; text: string; startedAt: number; replyLanguage?: ReplyLanguage };

/** The one placeholder used everywhere something is still on its way. */
/** One short, friendly word while the answer is on its way (Raycast's top bar shows the progress). */
const WORKING: Record<Mode | "lookup", string> = {
  translate: "Translating…",
  lookup: "Looking up…",
  reply: "Drafting a reply…",
  rewrite: "Polishing…",
};

/** Rewrite answers are "<rewritten>\n---LESSONS---\n<bullets>"; split them (also mid-stream). */
export function splitLessons(output: string): { main: string; lessons: string } {
  const at = output.indexOf(LESSONS_MARKER);
  if (at === -1) {
    // Hide a half-streamed marker such as "\n---LES" until it completes.
    return { main: output.replace(/\n-{1,3}[A-Z-]*$/, "").trim(), lessons: "" };
  }
  return { main: output.slice(0, at).trim(), lessons: output.slice(at + LESSONS_MARKER.length).trim() };
}

function buildPrompt(mode: Mode, text: string, replyLanguage?: ReplyLanguage): { title: string; system: string } {
  if (mode === "translate") {
    const lang = yourLanguage();
    const target = translationTarget(text, lang);
    const title = target === "English" ? "🇬🇧 English" : `${lang.flag} ${lang.name}`;
    // A word or short phrase is a dictionary lookup: meanings, usage and examples in one streamed answer.
    return { title, system: systemPrompt(isLookupText(text) ? "lookup" : "translate", target) };
  }
  return mode === "rewrite"
    ? { title: "✨ Polished", system: systemPrompt("rewrite") }
    : replyLanguage === "english"
      ? { title: "💬 Reply (English)", system: systemPrompt("reply", "English") }
      : { title: "💬 Reply", system: systemPrompt("reply") };
}

const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
// Small models sometimes wrap the answer in <text> tags, or echo the input block back.
// Drop a block only when it is the echoed input; otherwise keep its content.
export const cleanOutput = (output: string, input: string) =>
  output
    .replace(/<text>([\s\S]*?)<\/text>/g, (_, inner: string) => (normalize(inner) === normalize(input) ? "" : inner))
    .replace(/<\/?text>/g, "")
    .trim();

/**
 * Markdown from the model is rendered by Raycast, which loads remote images by itself. A prompt
 * injected through the selected text could make the model emit an image URL carrying private text
 * to someone else's server, so images are removed before rendering.
 */
export const stripImages = (markdown: string) =>
  markdown
    // Inline, full, collapsed and shortcut images: ![a](url), ![a][ref], ![a][], ![a]
    .replace(/!\[[^\]]*\](\([^)]*\)|\[[^\]]*\])?/g, "")
    // Reference definitions ([ref]: url), which a shortcut image elsewhere could point at
    .replace(/^ {0,3}\[[^\]]+\]:[ \t]*\S+.*$/gm, "")
    .replace(/<(img|picture|source|image|svg)\b[^>]*>/gi, "");

// On an error: the provider, key or model is the usual cause. Fix it, come back, then ⌘R.
const settingsAction = <Action.Push title="AI Setup" icon={Icon.Plug} target={<AISetup />} />;

const BUDDIES: Record<Mode, { title: string; icon: string }> = {
  translate: { title: "Buddy Translate", icon: "buddy-translate.png" },
  reply: { title: "Buddy Draft Reply", icon: "buddy-draft-reply.png" },
  rewrite: { title: "Buddy Polish English", icon: "buddy-polish.png" },
};

/**
 * What can follow a finished answer, and on which text:
 * - after Translate (sentences): draft a reply to the message itself; polish the English result
 *   when it was translated into English (write in your language, translate, then polish)
 * - after Draft Reply / Polish English: translate the answer, to check what it says in your language
 */
export function continueTargets({
  mode,
  input,
  output,
  toEnglish,
  isLookup,
}: {
  mode: Mode;
  input: string;
  output: string;
  toEnglish: boolean;
  isLookup: boolean;
}): { mode: Mode; text: string }[] {
  const answer = output.trim();
  if (mode !== "translate") return answer ? [{ mode: "translate", text: answer }] : [];
  if (isLookup) return []; // a dictionary card: a word is no message to reply to or draft to polish
  const list: { mode: Mode; text: string }[] = [{ mode: "reply", text: input }];
  if (toEnglish && answer) list.push({ mode: "rewrite", text: answer });
  return list;
}

/** ⌘B: run another buddy on this text (see continueTargets). */
function ContinueWith({ targets }: { targets: { mode: Mode; text: string }[] }) {
  const { push } = useNavigation();
  if (!targets.length) return null;
  return (
    <ActionPanel.Submenu title="Continue with" icon={Icon.ArrowRight} shortcut={{ modifiers: ["cmd"], key: "b" }}>
      {targets.map((c) => (
        <Action
          key={c.mode}
          title={BUDDIES[c.mode].title}
          icon={BUDDIES[c.mode].icon}
          onAction={() =>
            // Draft Reply goes through its own command, which reads its Reply Language setting.
            c.mode === "reply"
              ? runDraftReply(c.text)
              : push(<LLMView mode={c.mode} text={c.text} startedAt={Date.now()} />)
          }
        />
      ))}
    </ActionPanel.Submenu>
  );
}

type Lesson = { wrong?: string; right?: string; why: string };

/**
 * Lesson bullets look like "- `wrong` → `right`: explanation". Keep only lessons about phrases
 * that really appear in my draft (small models sometimes "correct" text added from the idea).
 */
function parseLessons(lessons: string, original: string): Lesson[] {
  const draft = normalize(original).toLowerCase();
  return lessons
    .split("\n")
    .map((l) => l.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean)
    .map((l): Lesson => {
      const m = l.match(/^`([^`]+)`\s*→\s*`([^`]+)`\s*:?\s*(.*)$/);
      return m ? { wrong: m[1], right: m[2], why: m[3] } : { why: l.replace(/`/g, "") };
    })
    .filter((l) => !l.wrong || draft.includes(normalize(l.wrong).toLowerCase()));
}

type Run = { id: number; at: number; idea: string; previous: string };

/**
 * Streams one LLM answer. Re-runs on a new selection, or via regenerate(idea, previous):
 * with `previous` the model revises that version instead of starting from scratch.
 */
function useLLM({ mode, text, startedAt, replyLanguage }: LLMRequest) {
  const model = modelFor(mode);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string>();
  const [totalMs, setTotalMs] = useState<number>();
  const [run, setRun] = useState<Run>({ id: 0, at: startedAt, idea: "", previous: "" });
  // Read once per request (custom prompts come from a file), not on every loading tick.
  const { title, system } = useMemo(() => buildPrompt(mode, text, replyLanguage), [mode, text, replyLanguage]);

  // A new selection starts a fresh run (Raycast may reuse this view).
  useEffect(() => {
    setRun((r) => (r.id === 0 && r.at === startedAt ? r : { id: 0, at: startedAt, idea: "", previous: "" }));
  }, [mode, text, startedAt]);

  // Dictionary lookups are cached whole: a word looked up before shows instantly (⌘R still regenerates).
  const cacheable = mode === "translate" && isLookupText(text);

  useEffect(() => {
    const controller = new AbortController();
    setOutput("");
    setError(undefined);
    setTotalMs(undefined);
    const cached = cacheable && run.id === 0 ? getCachedLookup(text, system) : undefined;
    if (cached) {
      setOutput(cached);
      setTotalMs(0);
      return;
    }
    const user =
      dataBlock("text", text) +
      (run.previous ? `\n${dataBlock("previous", run.previous)}` : "") +
      (run.idea ? `\n${dataBlock("idea", run.idea)}` : "");
    (async () => {
      try {
        let full = "";
        for await (const chunk of streamChat(model, system, user, controller.signal)) {
          full += chunk;
          setOutput((prev) => prev + chunk);
        }
        if (cacheable && full.trim()) setCachedLookup(text, system, full);
      } catch (e) {
        if (!controller.signal.aborted) {
          const message = e instanceof Error ? e.message : String(e);
          setError(message);
        }
      } finally {
        if (!controller.signal.aborted) setTotalMs(Date.now() - run.at);
      }
    })();
    return () => controller.abort();
  }, [run]);

  const isLoading = totalMs === undefined;

  const cleaned = cleanOutput(output, text);
  const { main: result, lessons } = mode === "rewrite" ? splitLessons(cleaned) : { main: cleaned, lessons: "" };
  const regenerate = (idea = "", previous = "") => setRun((r) => ({ id: r.id + 1, at: Date.now(), idea, previous }));

  return {
    title,
    result,
    lessons,
    error,
    isLoading,
    isRevision: run.previous !== "",
    regenerate,
  };
}

/**
 * Reply / Rewrite: a form to tweak the answer, or type an idea and press ⌘↵ to revise the
 * current version (edits included). Without an idea, ⌘↵ copies (Reply) or replaces the
 * still-selected draft (Rewrite).
 */
function EditableForm(request: LLMRequest) {
  const t = texts();
  const isRewrite = request.mode === "rewrite";
  const llm = useLLM(request);
  const [answer, setAnswer] = useState(""); // editable copy of the streamed answer
  const [idea, setIdea] = useState("");
  const [applied, setApplied] = useState<string[]>([]); // ideas applied so far
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => setAnswer(llm.result), [llm.result]);
  useEffect(() => {
    setIdea("");
    setApplied([]);
    setLessons([]);
  }, [request.text, request.startedAt]);
  // Lessons are about my original draft, so keep the ones from the first (non-revision) run.
  useEffect(() => {
    if (!llm.isRevision && !llm.isLoading) setLessons(parseLessons(llm.lessons, request.text));
  }, [llm.isRevision, llm.isLoading, llm.lessons]);

  const hasIdea = idea.trim() !== "";
  const revise = () => {
    const next = idea.trim();
    setApplied((list) => [...list, next]);
    setIdea("");
    llm.regenerate(next, answer);
  };
  const startOver = () => {
    setApplied([]);
    setIdea("");
    llm.regenerate();
  };

  const copy = (
    <Action.CopyToClipboard
      title={isRewrite ? "Copy" : "Copy Reply"}
      icon={Icon.Clipboard}
      content={answer}
      shortcut={Keyboard.Shortcut.Common.Copy}
    />
  );
  // Rewrite: the draft is still selected in the chat box, so pasting replaces it.
  const replace = (
    <Action.Paste title="Replace Draft" content={answer} shortcut={{ modifiers: ["cmd", "shift"], key: "v" }} />
  );
  const [primary, secondary] = isRewrite ? [replace, copy] : [copy, undefined];

  return (
    <Form
      isLoading={llm.isLoading}
      actions={
        <ActionPanel>
          {/* Use the answer · go further · redo. */}
          <ActionPanel.Section>
            {hasIdea && <Action title="Apply Idea" icon={Icon.Wand} onAction={revise} />}
            {llm.error && settingsAction}
            {answer && primary}
            {answer && secondary}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {!llm.isLoading && (
              <ContinueWith
                targets={continueTargets({
                  ...request,
                  input: request.text,
                  output: answer,
                  toEnglish: false,
                  isLookup: false,
                })}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Start over"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={startOver}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description title={isRewrite ? "📝 Original" : "💬 Message"} text={request.text} />
      {llm.error ? (
        <Form.Description title="⚠️ Error" text={llm.error} />
      ) : (
        <Form.TextArea
          id="answer"
          title={llm.title}
          value={answer}
          onChange={setAnswer}
          placeholder={llm.isLoading ? WORKING[request.mode] : "(empty response)"}
        />
      )}
      <Form.TextField
        id="idea"
        title="💡 Idea"
        value={idea}
        onChange={setIdea}
        placeholder={t.ideaPlaceholder[isRewrite ? "rewrite" : "reply"]}
      />
      {applied.length > 0 && <Form.Description title="" text={`${t.applied}: ${applied.join(" → ")}`} />}
      {lessons.length > 0 && <Form.Separator />}
      {/* Form.Description collapses newlines, so each lesson gets its own rows. */}
      {lessons.flatMap((l, i) => {
        const title = i === 0 ? "📘 Lessons" : "";
        return l.wrong
          ? [
              <Form.Description key={`${i}-fix`} title={title} text={`✗ ${l.wrong}   →   ✓ ${l.right}`} />,
              <Form.Description key={`${i}-why`} title="" text={`↳ ${l.why}`} />,
            ]
          : [<Form.Description key={`${i}-why`} title={title} text={l.why} />];
      })}
    </Form>
  );
}

/** Pronunciation for the English side of a finished translation (source or result). */
function usePronunciation(english: string | undefined) {
  const [items, setItems] = useState<Pron[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    setItems([]);
    if (!english) return setIsLoading(false);
    const controller = new AbortController();
    setIsLoading(true);
    loadPronunciations(english, controller.signal, (list) => {
      if (!controller.signal.aborted) setItems(list.filter((p) => p.ipa));
    })
      .catch(() => undefined)
      .finally(() => !controller.signal.aborted && setIsLoading(false));
    return () => {
      controller.abort();
      setIsLoading(false);
    };
  }, [english]);
  return { items, isLoading };
}

/** Usage + examples section of a dictionary card. */
function usageMarkdown({
  context,
  phrases,
  examples,
}: {
  context: string;
  phrases: string[];
  examples: { en: string; ipa: string; native: string }[];
}) {
  if (!context && !phrases.length && !examples.length) return "";
  const t = texts();
  const parts = ["---"];
  if (context) parts.push(`#### ${t.usage}`, context);
  if (phrases.length) parts.push(`**${t.phrases}:** ${phrases.map((c) => `\`${c}\``).join("  ")}`);
  if (examples.length) {
    const keys = examples.map((_, i) => `⌘${i + 1}`).join(" · ");
    parts.push(`#### ${t.examples}\n\n_🔊 ${t.listenHint(keys)}_`);
    // One paragraph per example: English, its IPA, then the native-language line. "  \n" is a hard line break so lines can't merge.
    parts.push(
      ...examples.map((e, i) =>
        [`**${i + 1}.** ${e.en}`, e.ipa && `🗣 ${e.ipa}`, e.native && `↳ _${e.native}_`].filter(Boolean).join("  \n"),
      ),
    );
  }
  return parts.join("\n\n");
}

async function play(action: () => Promise<void>) {
  try {
    await action();
  } catch (e) {
    await showFailureToast(e, { title: "Cannot play audio" });
  }
}

/** Translate: a read-only markdown view, plus pronunciation of the English side. */
function ResultDetail(request: LLMRequest) {
  const t = texts();
  const llm = useLLM(request);
  const lang = yourLanguage();
  const toEnglish = isNative(request.text, lang);
  // A word / short phrase in either language is a dictionary lookup (same rule as the translate prompt).
  const isLookup = isLookupText(request.text);
  const safeResult = stripImages(llm.result);
  const lookup = isLookup ? parseLookup(safeResult) : undefined;
  // English side: the source when translating EN→VI, the result when VI→EN.
  // For a VI→EN lookup use the first English meaning as soon as the MEANING line is complete.
  const english = toEnglish
    ? lookup
      ? lookup.meaningDone
        ? lookup.meaning.split(/[;,]/)[0].trim()
        : undefined
      : llm.isLoading
        ? undefined
        : llm.result
    : request.text;
  const pron = usePronunciation(llm.error ? undefined : english);
  const first = pron.items[0];
  const copyText = lookup ? lookup.meaning : llm.result; // copy the raw text; only rendering is sanitized

  // Word / short phrase: one dictionary card, sections appear as they arrive, a single Loading line at the end.
  //   ## security
  //   (n) /sɪˈkjɚrəti/
  //   <meaning in your language>
  //   --- Usage · Common phrases · Examples
  const ipaLines = pron.items.map((p) => `${p.pos ? `**(${p.pos})** ` : ""}\`${p.ipa}\``).join("  \n");
  const card = lookup
    ? [
        `## ${request.text}`,
        toEnglish ? lookup.meaning : ipaLines, // VI→EN: IPA belongs to the English meaning, shown after it
        toEnglish ? ipaLines : lookup.meaning,
        usageMarkdown(lookup),
        lookup.meaning ? "" : llm.isLoading ? `_${WORKING.lookup}_` : "_(empty response)_",
      ]
        .filter(Boolean)
        .join("\n\n")
    : "";
  const result = safeResult || (llm.isLoading ? `_${WORKING.translate}_` : "_(empty response)_");

  // Sentence: the original quoted on top (as in Draft Reply / Polish English), the translation streams below.
  const quoted = request.text
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");
  // Images are removed from the whole page, the original text included: it is pasted by anyone.
  const markdown = stripImages(
    llm.error ? `## ⚠️ Error\n\n\`\`\`\n${llm.error}\n\`\`\`` : isLookup ? card : `${quoted}\n\n---\n\n${result}`,
  );

  const metadata = !llm.error && !isLookup && (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title={t.direction}
        text={toEnglish ? `${lang.name} → English` : `English → ${lang.name}`}
      />
      {/* Vocabulary appears when it arrives; nothing to show means no row at all. */}
      {pron.items.length > 0 && (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title={t.vocabulary} />
          {pron.items.map((p, i) => (
            <Detail.Metadata.Label
              key={`${p.word}-${i}`}
              title={`${p.word}${p.pos ? ` (${p.pos})` : ""}`}
              text={p.meaning ? `${p.ipa} · ${p.meaning}` : p.ipa}
            />
          ))}
        </>
      )}
    </Detail.Metadata>
  );

  return (
    <Detail
      isLoading={llm.isLoading || pron.isLoading}
      markdown={markdown}
      metadata={metadata || undefined}
      actions={
        <ActionPanel>
          {/* Use the result · listen · go further · redo. Enter copies, ⌘L listens. */}
          <ActionPanel.Section>
            {llm.error && settingsAction}
            {copyText && <Action.CopyToClipboard content={copyText} />}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {english && (
              <Action
                title="Listen"
                icon={Icon.SpeakerHigh}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
                onAction={() => play(() => speak(english))}
              />
            )}
            {english && (
              <Action
                title="Listen Slowly"
                icon={Icon.SpeakerLow}
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                onAction={() => play(() => speak(english, true))}
              />
            )}
            {lookup?.examples.map((e, i) => (
              <Action
                key={`ex-${i}`}
                title={`Listen Example ${i + 1}`}
                icon={Icon.SpeakerOn}
                shortcut={{ modifiers: ["cmd"], key: String(i + 1) as "1" | "2" | "3" }}
                onAction={() => play(() => speak(e.en.replace(/\*\*/g, "")))}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {!llm.isLoading && !llm.error && (
              <ContinueWith
                targets={continueTargets({
                  mode: "translate",
                  input: request.text,
                  output: llm.result,
                  toEnglish,
                  isLookup,
                })}
              />
            )}
            {first && (
              <Action.OpenInBrowser
                title="Open in Cambridge"
                url={cambridgeUrl(first.word)}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Regenerate"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={() => llm.regenerate()}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function LLMView(request: LLMRequest) {
  const { text, clipped } = clipInput(request.text);
  // Warnings, once per request: an oversized input was cut, or the endpoint is unencrypted.
  useEffect(() => {
    const t = texts();
    const warnings = [
      clipped && t.clipped(MAX_INPUT_CHARS.toLocaleString("en-US")),
      isInsecureEndpoint(getConfig().baseUrl) && t.insecure,
    ].filter(Boolean) as string[];
    if (warnings.length)
      showToast({
        style: Toast.Style.Failure,
        title: warnings[0],
        message: warnings.slice(1).join(" · ") || undefined,
      });
  }, [request.text, request.startedAt]);

  const clippedRequest = { ...request, text };
  return request.mode === "translate" ? <ResultDetail {...clippedRequest} /> : <EditableForm {...clippedRequest} />;
}
