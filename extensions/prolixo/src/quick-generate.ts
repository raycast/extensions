import {
  Clipboard,
  LaunchProps,
  Toast,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";
import {
  ExtensionPreferences,
  GenerateOptions,
  OutputType,
  ProlixoApiError,
  generateText,
  parseCountArg,
} from "./api";

export interface CountArguments {
  count?: string;
}

export async function runQuickGenerate(
  props: LaunchProps<{ arguments: CountArguments }>,
  outputType: OutputType,
  defaultCount: number,
): Promise<void> {
  const prefs = getPreferenceValues<ExtensionPreferences>();

  let count: number;
  try {
    count = parseCountArg(props.arguments.count, defaultCount);
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid count",
      message: err instanceof Error ? err.message : "Enter a number between 1 and 100.",
    });
    return;
  }

  const options: GenerateOptions = {
    lang: prefs.defaultLang ?? "pt",
    type: outputType,
    theme: prefs.defaultTheme ?? "business",
    count,
    grammar_correct: prefs.grammarCorrect ?? true,
    orthography_correct: prefs.orthographyCorrect ?? true,
  };

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Generating ${count} ${outputType}...`,
  });

  try {
    const { formattedText } = await generateText(prefs.apiUrl, options);
    await toast.hide();

    if (prefs.quickAction === "paste") {
      await Clipboard.paste(formattedText);
      await showHUD(`Pasted ${count} ${outputType}`);
    } else {
      await Clipboard.copy(formattedText);
      await showHUD(`Copied ${count} ${outputType} to clipboard`);
    }
  } catch (err) {
    toast.style = Toast.Style.Failure;
    if (err instanceof ProlixoApiError && err.status === 429) {
      toast.title = "Rate limit exceeded";
      toast.message = err.retryAfter
        ? `Please try again in ${err.retryAfter} seconds.`
        : err.message;
    } else {
      toast.title = "Generation failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }
}
