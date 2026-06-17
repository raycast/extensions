import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  LaunchProps,
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { translate } from "./deepl";

type CompletedTranslation = {
  sourceText: string;
  translatedText: string;
  sourceLang?: string;
  targetLang: "EN" | "RU";
  rule: string;
};

type TranslationState =
  | { status: "loading"; sourceText: string }
  | {
      status: "success";
      sourceText: string;
      translatedText: string;
      sourceLang?: string;
      targetLang: "EN" | "RU";
      rule: string;
    }
  | { status: "error"; sourceText: string; message: string };

function markdownForState(state: TranslationState) {
  if (state.status === "loading") {
    return `Translating...\n\n${state.sourceText}`;
  }

  if (state.status === "error") {
    return `# Translation failed\n\n${state.message}\n\n## Source\n\n${state.sourceText}`;
  }

  return [`# Translation`, state.translatedText, "", "## Source", state.sourceText].join("\n\n");
}

export default function Command(
  props: LaunchProps<{ arguments: Arguments.TranslateText; launchContext?: CompletedTranslation }>,
) {
  const preferences = getPreferenceValues<Preferences>();
  const completedTranslation = props.launchContext;
  const sourceText = (completedTranslation?.sourceText || props.fallbackText || props.arguments.text).trim();
  const [state, setState] = useState<TranslationState>(
    completedTranslation
      ? { status: "success", ...completedTranslation }
      : {
          status: "loading",
          sourceText,
        },
  );

  async function translateText() {
    if (!sourceText) {
      setState({ status: "error", sourceText, message: "Text is empty" });
      await showToast({ style: Toast.Style.Failure, title: "Text is empty" });
      return;
    }

    setState({ status: "loading", sourceText });
    try {
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
      setState({ status: "error", sourceText, message });
      await showFailureToast(error, { title: "Couldn't translate text" });
    }
  }

  useEffect(() => {
    if (completedTranslation) {
      return;
    }

    translateText();
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
          <Action title="Translate Again" icon={Icon.ArrowClockwise} onAction={translateText} />
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
