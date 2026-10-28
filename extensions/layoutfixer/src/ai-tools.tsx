import {
  Action,
  ActionPanel,
  AI,
  Clipboard,
  Detail,
  environment,
  Icon,
  List,
  popToRoot,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { loadEngine, readSelectionOrClipboard, remember, replaceSelection, runFix, TextSource } from "./lib/engine";
import { openSetupOnFirstRun } from "./lib/onboarding";

interface Task {
  id: string;
  title: string;
  subtitle: string;
  icon: Icon;
  instruction: string;
}

const TASKS: Task[] = [
  {
    id: "fix",
    title: "Fix Everything",
    subtitle: "Layout, spelling and grammar, same language",
    icon: Icon.Wand,
    instruction:
      "Fix spelling, grammar, punctuation and any words typed with the wrong keyboard layout (English ⇄ Persian). Keep the language, meaning, tone and line breaks. Use correct Persian half-spaces (نیم‌فاصله).",
  },
  {
    id: "formal",
    title: "Make Formal Persian",
    subtitle: "رسمی و نوشتاری",
    icon: Icon.Document,
    instruction:
      "Rewrite the text in formal, written Persian (فارسی رسمی و نوشتاری), turning colloquial forms like «میخوام» into «می‌خواهم». Keep the meaning. Use correct half-spaces.",
  },
  {
    id: "casual",
    title: "Make Casual Persian",
    subtitle: "محاوره‌ای و خودمانی",
    icon: Icon.SpeechBubble,
    instruction:
      "Rewrite the text in natural, casual spoken Persian (فارسی محاوره‌ای), as a friend would text it. Keep the meaning. Use correct half-spaces.",
  },
  {
    id: "en",
    title: "Translate to English",
    subtitle: "Natural, not word for word",
    icon: Icon.Globe,
    instruction: "Translate the text into natural English. Keep the tone and line breaks.",
  },
  {
    id: "fa",
    title: "Translate to Persian",
    subtitle: "ترجمه‌ی روان به فارسی",
    icon: Icon.Globe,
    instruction:
      "Translate the text into fluent, natural Persian. Keep the tone and line breaks. Use correct half-spaces.",
  },
  {
    id: "finglish",
    title: "Finglish to Persian",
    subtitle: "salam khobi → سلام خوبی",
    icon: Icon.Text,
    instruction:
      "The text is Persian written with Latin letters (Finglish). Write it in Persian script with correct spelling and half-spaces. Leave real English words in English.",
  },
  {
    id: "shorter",
    title: "Make Shorter",
    subtitle: "Same language",
    icon: Icon.ShortParagraph,
    instruction: "Make the text shorter and clearer, in the same language. Keep the key points.",
  },
];

function prompt(task: Task, text: string): string {
  return `${task.instruction}\n\nReply with only the resulting text: no quotes, no explanations, no preamble.\n\nText:\n${text}`;
}

function Result({ task, source }: { task: Task; source: TextSource }) {
  const [output, setOutput] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Fix keyboard-layout mistakes first, so the AI sees real words.
      const engine = await loadEngine();
      const input = runFix(engine, source.text, { explicit: false }).text;
      const answer = AI.ask(prompt(task, input), { creativity: task.id === "casual" ? "medium" : "low" });
      answer.on("data", (chunk) => {
        if (!cancelled) setOutput((x) => x + chunk);
      });
      const full = await answer;
      if (!cancelled) {
        setOutput(full.trim());
        setDone(true);
        await remember(engine, "ai", source.text, full.trim());
      }
    })().catch((error: Error) => {
      setDone(true);
      showToast({ style: Toast.Style.Failure, title: "AI request failed", message: error.message });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function apply() {
    const engine = await loadEngine();
    if (source.from === "selection") await replaceSelection(output, engine.prefs.restoreClipboard);
    else await Clipboard.copy(output);
    await popToRoot();
  }

  return (
    <Detail
      isLoading={!done}
      navigationTitle={task.title}
      markdown={`${output || "…"}\n\n---\n\n**Original** (${source.from})\n\n${source.text}`}
      actions={
        done && output ? (
          <ActionPanel>
            <Action
              title={source.from === "selection" ? "Replace Selection" : "Copy Result"}
              icon={Icon.CheckCircle}
              onAction={apply}
            />
            <Action.Paste content={output} />
            <Action.CopyToClipboard content={output} shortcut={Keyboard.Shortcut.Common.Copy} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

export default function Command() {
  const [source, setSource] = useState<TextSource | null>();
  const canUseAI = environment.canAccess(AI);

  useEffect(() => {
    openSetupOnFirstRun().then((opened) => {
      if (!opened) readSelectionOrClipboard().then(setSource);
    });
  }, []);

  if (!canUseAI) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Stars}
          title="AI Writing Tools need Raycast Pro"
          description="Every other LayoutFixer command works without it."
        />
      </List>
    );
  }

  if (source === null) {
    return (
      <List>
        <List.EmptyView icon={Icon.Text} title="Select some text or copy it first" />
      </List>
    );
  }

  return (
    <List isLoading={source === undefined} navigationTitle="AI Writing Tools">
      <List.Section title={source ? `From the ${source.from}: ${source.text.trim().slice(0, 50)}` : undefined}>
        {TASKS.map((task) => (
          <List.Item
            key={task.id}
            title={task.title}
            subtitle={task.subtitle}
            icon={task.icon}
            actions={
              source ? (
                <ActionPanel>
                  <Action.Push title={task.title} icon={task.icon} target={<Result task={task} source={source} />} />
                </ActionPanel>
              ) : undefined
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
