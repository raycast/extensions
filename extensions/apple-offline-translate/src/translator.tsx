import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  environment,
  getSelectedText,
  Icon,
  Keyboard,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { callNative } from "./native";
import { translationDocument } from "./preview";
import { openTranslationWindow } from "./launch-window";
import { inputError, Language, SourceText, Translation } from "./protocol";

function plainMarkdown(text: string) {
  // A fenced block displays source text literally; links and images cannot load remotely.
  const fence = "`".repeat(
    Math.max(
      3,
      ...Array.from(text.matchAll(/`+/g), (match) => match[0].length + 1),
    ),
  );
  return `${fence}\n${text}\n${fence}`;
}

export default function Translator() {
  const [input, setInput] = useState<SourceText>({ text: "" });
  const [mode, setMode] = useState("paired");
  const [source, setSource] = useState("auto");
  const [target, setTarget] = useState("ru");
  const [languages, setLanguages] = useState<Language[]>([]);
  const [ready, setReady] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [completed, setCompleted] = useState<{
    key: string;
    result?: Translation;
    error?: string;
  }>();
  const { push } = useNavigation();
  const key = JSON.stringify([input, mode, source, target, attempt]);
  const current = completed?.key === key ? completed : undefined;
  const result = current?.result;
  const translation = result?.text ?? "";
  const rich =
    result && translation === result.text && result.html
      ? { text: translation, html: result.html }
      : translation;
  const error = setupError || inputError(input.text) || current?.error;
  const busy = !error && (!ready || (!!input.text.trim() && !current));

  useEffect(() => {
    const controller = new AbortController();
    async function initialize() {
      try {
        const [reply, savedMode, savedSource, savedTarget, selected] =
          await Promise.all([
            callNative({ operation: "languages" }, controller.signal),
            LocalStorage.getItem<string>("mode"),
            LocalStorage.getItem<string>("source"),
            LocalStorage.getItem<string>("target"),
            getSelectedText().catch(() => ""),
          ]);
        if (controller.signal.aborted) return;
        if (!("languages" in reply))
          throw new Error("Could not load translation languages.");
        setLanguages(reply.languages);
        setMode(savedMode === "manual" ? "manual" : "paired");
        setSource(
          savedSource && reply.languages.some((item) => item.id === savedSource)
            ? savedSource
            : "auto",
        );
        setTarget(
          savedTarget && reply.languages.some((item) => item.id === savedTarget)
            ? savedTarget
            : "ru",
        );
        setInput((existing) => (existing.text ? existing : { text: selected }));
        setReady(true);
      } catch (error) {
        if (!controller.signal.aborted)
          setSetupError(
            error instanceof Error
              ? error.message
              : "Apple Translate is unavailable.",
          );
      }
    }
    void initialize();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!ready || !input.text.trim() || inputError(input.text)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const reply = await callNative(
          {
            operation: "translate",
            ...input,
            source,
            target,
            paired: mode === "paired",
          },
          controller.signal,
        );
        if (!("sourceLanguage" in reply) || !("targetLanguage" in reply))
          throw new Error("The translation response was incomplete.");
        if (!controller.signal.aborted) setCompleted({ key, result: reply });
      } catch (error) {
        if (!controller.signal.aborted)
          setCompleted({
            key,
            error:
              error instanceof Error ? error.message : "Translation failed.",
          });
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, ready, input, mode, source, target]);

  function remember(name: string, value: string) {
    void LocalStorage.setItem(name, value).catch(() =>
      showToast({
        style: Toast.Style.Failure,
        title: "Could Not Save Language",
      }),
    );
  }
  function name(id: string) {
    return languages.find((language) => language.id === id)?.name ?? id;
  }
  async function useClipboard() {
    try {
      const reply = await callNative({ operation: "clipboard" });
      if (!("text" in reply)) throw new Error("Could not read the clipboard.");
      setInput({ text: reply.text, rtf: reply.rtf });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard Unavailable",
        message: error instanceof Error ? error.message : undefined,
      });
    }
  }
  function swap() {
    if (!result) return;
    setInput({
      text: translation,
      rtf: translation === result.text ? result.rtf : undefined,
    });
    if (mode === "manual") {
      setSource(result.targetLanguage);
      setTarget(result.sourceLanguage);
      remember("source", result.targetLanguage);
      remember("target", result.sourceLanguage);
    }
  }
  const actions = (
    <ActionPanel>
      {result && (
        <ActionPanel.Section>
          <Action
            title="Copy Translation"
            icon={Icon.Clipboard}
            onAction={() => Clipboard.copy(rich)}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          <Action
            title="Paste Translation to Active App"
            icon={Icon.Document}
            onAction={() => Clipboard.paste(rich)}
            shortcut={{ modifiers: ["cmd", "opt"], key: "return" }}
          />
          <Action
            title="Show Full Translation"
            icon={Icon.Paragraph}
            onAction={() =>
              push(
                <Detail
                  navigationTitle={`${name(result.sourceLanguage)} → ${name(result.targetLanguage)}`}
                  markdown={plainMarkdown(translation)}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        content={rich}
                        title="Copy Translation"
                      />
                      <Action.Paste content={rich} title="Paste Translation" />
                    </ActionPanel>
                  }
                />,
              )
            }
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action
            title="Swap Languages"
            icon={Icon.Switch}
            onAction={swap}
            shortcut={Keyboard.Shortcut.Common.Save}
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        <Action
          title="Edit Source Text"
          icon={Icon.Pencil}
          onAction={() =>
            push(
              <SourceEditor
                text={input.text}
                onSave={(text) => setInput({ text })}
              />,
            )
          }
          shortcut={Keyboard.Shortcut.Common.Edit}
        />
        <Action
          title="Paste Source Text"
          icon={Icon.Clipboard}
          onAction={useClipboard}
          shortcut={{ modifiers: ["cmd"], key: "v" }}
        />
        <Action
          title="Use Clipboard with Formatting"
          icon={Icon.Clipboard}
          onAction={useClipboard}
          shortcut={{ modifiers: ["cmd", "opt"], key: "v" }}
        />
        <ActionPanel.Submenu
          title="Translation Direction…"
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
        >
          <Action
            title="Russian ↔ English"
            onAction={() => {
              setMode("paired");
              remember("mode", "paired");
            }}
          />
          {languages.map((language) => (
            <Action
              key={language.id}
              title={language.name}
              onAction={() => {
                setMode("manual");
                setSource("auto");
                setTarget(language.id);
                remember("mode", "manual");
                remember("source", "auto");
                remember("target", language.id);
              }}
            />
          ))}
        </ActionPanel.Submenu>
        <Action
          title="Open Large Window"
          icon={Icon.AppWindow}
          onAction={() =>
            openTranslationWindow(input, {
              source,
              target,
              paired: mode === "paired",
            })
          }
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        />
        <Action
          title="Refresh Selected Text"
          icon={Icon.TextCursor}
          onAction={async () => {
            try {
              setInput({ text: await getSelectedText() });
            } catch {
              await showToast({
                style: Toast.Style.Failure,
                title: "No Selected Text",
              });
            }
          }}
        />
        <Action
          title="Retry Translation"
          icon={Icon.ArrowClockwise}
          onAction={() => setAttempt((value) => value + 1)}
          shortcut={Keyboard.Shortcut.Common.Refresh}
        />
        <Action
          title="Clear Text"
          icon={Icon.Trash}
          onAction={() => {
            setInput({ text: "" });
          }}
          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
  const document = translationDocument(
    input.text || "Paste text: ⌘V\nOr enter text: ⌘E",
    error ||
      translation ||
      (busy ? "Translating on Your Mac…" : "Your translation will appear here"),
    result ? `SOURCE · ${name(result.sourceLanguage)}` : "SOURCE",
    result ? `TRANSLATION · ${name(result.targetLanguage)}` : "TRANSLATION",
    environment.theme === "dark",
  );
  return (
    <Detail isLoading={busy} markdown={`![](${document})`} actions={actions} />
  );
}

function SourceEditor({
  text,
  onSave,
}: {
  text: string;
  onSave: (text: string) => void;
}) {
  const [draft, setDraft] = useState(text);
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Edit Source Text"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Translate"
            onSubmit={() => {
              if (!inputError(draft)) {
                onSave(draft);
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Source"
        value={draft}
        placeholder="Type or paste text to translate…"
        onChange={setDraft}
        autoFocus
        error={inputError(draft)}
      />
    </Form>
  );
}
