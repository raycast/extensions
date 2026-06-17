import { Action, ActionPanel, Clipboard, Detail, Icon, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { translate } from "./deepl";

type TranslationState =
  | {
      status: "idle" | "loading";
      sourceText?: string;
    }
  | {
      status: "success";
      sourceText: string;
      translatedText: string;
      sourceLang?: string;
      targetLang: "EN" | "RU";
      rule: string;
    }
  | {
      status: "error";
      sourceText?: string;
      message: string;
    };

function markdownForState(state: TranslationState) {
  if (state.status === "loading") {
    return "Translating clipboard...";
  }

  if (state.status === "error") {
    return `# Translation failed\n\n${state.message}`;
  }

  if (state.status !== "success") {
    return "Read clipboard text to translate it.";
  }

  return [`# Translation`, state.translatedText, "", "## Source", state.sourceText].join("\n\n");
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [state, setState] = useState<TranslationState>({ status: "idle" });

  async function translateClipboard() {
    setState({ status: "loading" });

    try {
      const sourceText = (await Clipboard.readText())?.trimEnd();
      if (!sourceText) {
        setState({ status: "error", message: "Clipboard is empty" });
        await showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
        return;
      }

      const result = await translate(sourceText, preferences);
      setState({
        status: "success",
        sourceText,
        translatedText: result.translatedText,
        sourceLang: result.sourceLang,
        targetLang: result.targetLang,
        rule: result.rule,
      });

      if (preferences.copyResult ?? true) {
        await Clipboard.copy(result.translatedText);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Translated",
        message: (preferences.copyResult ?? true) ? "Copied to clipboard" : undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setState({ status: "error", message });
      await showFailureToast(error, { title: "Couldn't translate clipboard" });
    }
  }

  useEffect(() => {
    translateClipboard();
  }, []);

  const metadata =
    state.status === "success" ? (
      <Detail.Metadata>
        <Detail.Metadata.Label title="Direction" text={`${state.sourceLang || "AUTO"} -> ${state.targetLang}`} />
        <Detail.Metadata.Label title="Rule" text={state.rule} />
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
          <Action title="Translate Clipboard Again" icon={Icon.ArrowClockwise} onAction={translateClipboard} />
          {state.status === "success" ? (
            <>
              <Action.CopyToClipboard title="Copy Translation" content={state.translatedText} />
              <Action.Paste title="Paste Translation" content={state.translatedText} />
              <Action.CopyToClipboard title="Copy Source" content={state.sourceText} />
            </>
          ) : null}
        </ActionPanel>
      }
    />
  );
}
