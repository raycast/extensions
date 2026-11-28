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
  useNavigation,
} from "@raycast/api";
import { useRef, useState } from "react";
import { setTimeout as delay } from "node:timers/promises";
import { showFailureToast, useLocalStorage, usePromise } from "@raycast/utils";
import { callNative } from "./native";
import { encodeLegacySetting } from "./settings-value";
import { openTranslationWindow } from "./launch-window";
import { inputError, Language, SourceText } from "./protocol";

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

export default function Command() {
  const migration = usePromise(
    async () => {
      for (const key of ["mode", "source", "target"]) {
        const value = await LocalStorage.getItem<string>(key);
        if (typeof value === "string") {
          const encoded = encodeLegacySetting(value);
          if (encoded !== value) await LocalStorage.setItem(key, encoded);
        }
      }
      return true;
    },
    [],
    { failureToastOptions: { title: "Could Not Load Saved Languages" } },
  );
  if (!migration.data)
    return (
      <Detail
        isLoading={migration.isLoading}
        markdown={migration.error ? plainMarkdown(migration.error.message) : ""}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={migration.revalidate}
            />
          </ActionPanel>
        }
      />
    );
  return <Translator />;
}

function Translator() {
  const [input, setInput] = useState<SourceText>({ text: "" });
  const {
    value: mode = "paired",
    setValue: setMode,
    isLoading: modeLoading,
  } = useLocalStorage<string>("mode", "paired");
  const {
    value: source = "auto",
    setValue: setSource,
    isLoading: sourceLoading,
  } = useLocalStorage<string>("source", "auto");
  const {
    value: target = "ru",
    setValue: setTarget,
    isLoading: targetLoading,
  } = useLocalStorage<string>("target", "ru");
  const { push } = useNavigation();
  const startupAbort = useRef<AbortController | null>(null);
  const translationAbort = useRef<AbortController | null>(null);
  const previewAbort = useRef<AbortController | null>(null);
  const startup = usePromise(
    async () => {
      const [reply, selected] = await Promise.all([
        callNative({ operation: "languages" }, startupAbort.current?.signal),
        getSelectedText().catch(() => ""),
      ]);
      if (!("languages" in reply))
        throw new Error("Could not load translation languages.");
      return { languages: reply.languages, selected };
    },
    [],
    {
      abortable: startupAbort,
      onData: (data) =>
        setInput((previous) =>
          previous.text ? previous : { text: data.selected },
        ),
      failureToastOptions: { title: "Could Not Initialize Apple Translate" },
    },
  );
  const languages: Language[] = startup.data?.languages ?? [];
  const ready =
    !!startup.data && !modeLoading && !sourceLoading && !targetLoading;
  const key = JSON.stringify([input, mode, source, target]);
  const translated = usePromise(
    async (
      payload: SourceText,
      direction: string,
      from: string,
      to: string,
      requestKey: string,
    ) => {
      const signal = translationAbort.current?.signal;
      await delay(400, undefined, { signal });
      const reply = await callNative(
        {
          operation: "translate",
          ...payload,
          source: from,
          target: to,
          paired: direction === "paired",
        },
        signal,
      );
      if (!("sourceLanguage" in reply) || !("targetLanguage" in reply))
        throw new Error("The translation response was incomplete.");
      return { key: requestKey, result: reply };
    },
    [input, mode, source, target, key],
    {
      execute: ready && !!input.text.trim() && !inputError(input.text),
      abortable: translationAbort,
      failureToastOptions: { title: "Could Not Translate Text" },
    },
  );
  const result =
    translated.data?.key === key && !translated.error && !translated.isLoading
      ? translated.data.result
      : undefined;
  const translation = result?.text ?? "";
  const rich = result?.html
    ? { text: translation, html: result.html }
    : translation;
  const error =
    startup.error?.message ||
    inputError(input.text) ||
    translated.error?.message;
  const busy =
    !startup.error &&
    (startup.isLoading ||
      !ready ||
      (ready &&
        !!input.text.trim() &&
        !inputError(input.text) &&
        translated.isLoading));

  async function chooseDirection(value: string) {
    try {
      if (value === "paired") await setMode("paired");
      else
        await Promise.all([
          setMode("manual"),
          setSource("auto"),
          setTarget(value),
        ]);
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Save Language" });
    }
  }

  async function retry() {
    if (!startup.data || startup.error) await startup.revalidate();
    else if (preview.error) await preview.revalidate();
    else if (input.text.trim()) await translated.revalidate();
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
      await showFailureToast(error, { title: "Clipboard Unavailable" });
    }
  }
  async function swap() {
    if (!result) return;
    setInput({
      text: translation,
      rtf: translation === result.text ? result.rtf : undefined,
    });
    if (mode === "manual") {
      try {
        await Promise.all([
          setSource(result.targetLanguage),
          setTarget(result.sourceLanguage),
        ]);
      } catch (error) {
        await showFailureToast(error, { title: "Could Not Save Language" });
      }
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
            // eslint-disable-next-line @raycast/prefer-common-shortcut -- Swapping languages is not a Save action.
            shortcut={{ modifiers: ["cmd"], key: "s" }}
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
            onAction={() => chooseDirection("paired")}
          />
          {languages.map((language) => (
            <Action
              key={language.id}
              title={language.name}
              onAction={() => chooseDirection(language.id)}
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
            } catch (error) {
              await showFailureToast(error, { title: "No Selected Text" });
            }
          }}
        />
        <Action
          title="Retry Translation"
          icon={Icon.ArrowClockwise}
          onAction={retry}
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
  const displaySource = input.text || "Paste text: ⌘V\nOr enter text: ⌘E";
  const displayTranslation =
    error ||
    translation ||
    (busy ? "Translating on Your Mac…" : "Your translation will appear here");
  const sourceLabel = result
    ? `SOURCE · ${name(result.sourceLanguage)}`
    : "SOURCE";
  const targetLabel = result
    ? `TRANSLATION · ${name(result.targetLanguage)}`
    : "TRANSLATION";
  const dark = environment.appearance === "dark";
  const displayKey = JSON.stringify([
    displaySource,
    displayTranslation,
    sourceLabel,
    targetLabel,
    dark,
  ]);
  const preview = usePromise(
    async (
      text: string,
      translation: string,
      sourceLabel: string,
      targetLabel: string,
      dark: boolean,
      key: string,
    ) => {
      const reply = await callNative(
        {
          operation: "preview",
          text,
          translation,
          sourceLabel,
          targetLabel,
          dark,
        },
        previewAbort.current?.signal,
      );
      if (!("document" in reply))
        throw new Error("Could not render the translation.");
      return { key, document: reply.document };
    },
    [
      displaySource,
      displayTranslation,
      sourceLabel,
      targetLabel,
      dark,
      displayKey,
    ],
    {
      abortable: previewAbort,
      failureToastOptions: { title: "Could Not Display Translation" },
    },
  );
  const markdown = preview.error
    ? plainMarkdown(preview.error.message)
    : preview.data?.key === displayKey
      ? `![Source and translation](${preview.data.document})`
      : "";
  return (
    <Detail
      isLoading={busy || preview.isLoading}
      markdown={markdown}
      actions={actions}
    />
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
