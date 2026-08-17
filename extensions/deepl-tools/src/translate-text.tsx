import { Action, ActionPanel, Detail, Form, Icon, LaunchProps, LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { translate } from "./deepl";
import { languageName } from "./languages";
import { AppPreferences, getConfiguredPreferences } from "./preferences";
import {
  CompletedTranslation,
  TranslationLaunchContext,
  getTranslationStorageKey,
  isCompletedTranslation,
  isTranslationStorageKey,
} from "./translation-payload";

type TranslateTextProps = LaunchProps<{
  arguments: Arguments.TranslateText;
  launchContext?: TranslationLaunchContext;
}>;

type TranslationState =
  | { status: "idle"; draft: string }
  | { status: "loading"; sourceText: string }
  | ({ status: "success" } & CompletedTranslation)
  | { status: "error"; message: string; sourceText: string };

function markdownForState(state: Exclude<TranslationState, { status: "idle" }>) {
  if (state.status === "loading") {
    return "# Translating\n\nSending your text securely to DeepL…";
  }

  if (state.status === "error") {
    return `# Translation failed\n\n${state.message}`;
  }

  return [`# Translation`, state.translatedText, "", "## Source", state.sourceText].join("\n\n");
}

function TranslateTextCommand({ props, preferences }: { props: TranslateTextProps; preferences: AppPreferences }) {
  const completedTranslation = isCompletedTranslation(props.launchContext) ? props.launchContext : undefined;
  const argumentText = (props.arguments as Partial<Arguments.TranslateText> | undefined)?.text?.trim() || "";
  const storageKey =
    getTranslationStorageKey(props.launchContext) || (isTranslationStorageKey(argumentText) ? argumentText : undefined);
  const [state, setState] = useState<TranslationState>(
    completedTranslation
      ? { status: "success", ...completedTranslation }
      : storageKey || argumentText
        ? { status: "loading", sourceText: argumentText }
        : { status: "idle", draft: "" },
  );

  const performTranslation = useCallback(async (sourceText: string) => {
    const trimmedText = sourceText.trim();
    if (!trimmedText) {
      setState({ status: "idle", draft: "" });
      return;
    }

    setState({ status: "loading", sourceText: trimmedText });
    try {
      const result = await translate(trimmedText, preferences);
      setState({ status: "success", sourceText: trimmedText, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setState({ status: "error", message, sourceText: trimmedText });
      await showFailureToast(error, { title: "Couldn't translate text" });
    }
  }, []);

  useEffect(() => {
    if (completedTranslation) return;

    if (!storageKey) {
      if (argumentText) void performTranslation(argumentText);
      return;
    }

    async function loadStoredTranslation() {
      try {
        const serializedTranslation = await LocalStorage.getItem<string>(storageKey as string);
        await LocalStorage.removeItem(storageKey as string);

        if (!serializedTranslation) {
          throw new Error("Stored translation was not found");
        }

        const storedTranslation = JSON.parse(serializedTranslation) as CompletedTranslation;
        setState({ status: "success", ...storedTranslation });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setState({ status: "error", message, sourceText: "" });
        await showFailureToast(error, { title: "Couldn't open translation" });
      }
    }

    void loadStoredTranslation();
  }, [argumentText, completedTranslation, performTranslation, storageKey]);

  if (state.status === "idle") {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Translate"
              icon={Icon.Stars}
              onSubmit={(values: { text: string }) => performTranslation(values.text)}
            />
          </ActionPanel>
        }
      >
        <Form.TextArea
          id="text"
          title="Text"
          placeholder={`Type or paste text in ${languageName(preferences.primaryLanguage)} or ${languageName(preferences.secondaryLanguage)}`}
          defaultValue={state.draft}
          autoFocus
        />
        <Form.Description
          title="Direction"
          text={`${languageName(preferences.primaryLanguage)} ↔ ${languageName(preferences.secondaryLanguage)}`}
        />
      </Form>
    );
  }

  const metadata =
    state.status === "success" ? (
      <Detail.Metadata>
        <Detail.Metadata.Label
          title="Direction"
          text={`${languageName(state.sourceLang || "AUTO")} → ${languageName(state.targetLang)}`}
        />
        <Detail.Metadata.Label title="Routing" text={state.rule} />
        <Detail.Metadata.Label title="Characters" text={String(state.sourceText.length)} />
      </Detail.Metadata>
    ) : undefined;

  return (
    <Detail
      isLoading={state.status === "loading"}
      markdown={markdownForState(state)}
      metadata={metadata}
      actions={
        <ActionPanel>
          {state.status === "success" ? (
            <>
              <Action.CopyToClipboard title="Copy Translation" icon={Icon.Clipboard} content={state.translatedText} />
              <Action.Paste title="Paste Translation" content={state.translatedText} />
              <Action
                title="Translate Something Else"
                icon={Icon.Pencil}
                onAction={() => setState({ status: "idle", draft: "" })}
              />
              <Action.CopyToClipboard title="Copy Source" content={state.sourceText} />
            </>
          ) : null}
          {state.status === "error" ? (
            <>
              <Action
                title="Try Again"
                icon={Icon.RotateClockwise}
                onAction={() => performTranslation(state.sourceText)}
              />
              <Action
                title="Edit Text"
                icon={Icon.Pencil}
                onAction={() => setState({ status: "idle", draft: state.sourceText })}
              />
            </>
          ) : null}
        </ActionPanel>
      }
    />
  );
}

export default function Command(props: TranslateTextProps) {
  return <TranslateTextCommand props={props} preferences={getConfiguredPreferences()} />;
}
