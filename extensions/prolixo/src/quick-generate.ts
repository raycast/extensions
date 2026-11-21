import { Clipboard, LaunchProps, Toast, getPreferenceValues, showHUD, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { GenerateOptions, OutputType, ProlixoApiError, generateText, parseCountArg } from "./api";

export async function runQuickGenerate(
  props: LaunchProps<{ arguments: { count?: string } }>,
  outputType: OutputType,
  defaultCount: number,
): Promise<void> {
  const prefs = getPreferenceValues<Preferences>();

  let count: number;
  try {
    count = parseCountArg(props.arguments.count, defaultCount);
  } catch (err) {
    await showFailureToast(err, { title: "Invalid count" });
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
    await toast.hide();
    if (err instanceof ProlixoApiError && err.status === 429) {
      const message = err.retryAfter ? `Please try again in ${err.retryAfter} seconds.` : err.message;
      await showFailureToast(new Error(message), { title: "Rate limit exceeded" });
    } else {
      await showFailureToast(err, { title: "Generation failed" });
    }
  }
}
