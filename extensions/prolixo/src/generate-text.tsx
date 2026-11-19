import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  Toast,
  getPreferenceValues,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useLocalStorage } from "@raycast/utils";
import { useState } from "react";
import {
  GenerateOptions,
  LANGUAGES,
  LanguageCode,
  OUTPUT_TYPES,
  OutputType,
  ProlixoApiError,
  THEMES,
  ThemeCode,
  generateText,
  parseCountArg,
} from "./api";

const STORAGE_KEY = "prolixo_last_options";

const DEFAULT_OPTIONS: GenerateOptions = {
  lang: "pt",
  type: "paragraphs",
  theme: "business",
  count: 3,
  grammar_correct: true,
  orthography_correct: true,
};

function ResultDetail({
  initialText,
  options,
  apiUrl,
}: {
  initialText: string;
  options: GenerateOptions;
  apiUrl?: string;
}) {
  const [text, setText] = useState(initialText);
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegenerate() {
    if (isLoading) return;
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Regenerating text...",
    });
    try {
      const { formattedText } = await generateText(apiUrl, options);
      setText(formattedText);
      toast.style = Toast.Style.Success;
      toast.title = "Text regenerated";
    } catch (err) {
      await toast.hide();
      await showFailureToast(err, { title: "Failed to regenerate" });
    } finally {
      setIsLoading(false);
    }
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <Detail
      isLoading={isLoading}
      markdown={text}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Language" text={options.lang.toUpperCase()} />
          <Detail.Metadata.Label title="Type" text={options.type} />
          <Detail.Metadata.Label
            title="Theme"
            text={options.lang === "la" ? "Classical (N/A)" : options.theme}
          />
          <Detail.Metadata.Label title="Count" text={String(options.count)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Characters" text={String(text.length)} />
          <Detail.Metadata.Label title="Words" text={String(wordCount)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Paste title="Paste to Active App" content={text} />
          <Action.CopyToClipboard title="Copy to Clipboard" content={text} />
          <Action
            title="Regenerate"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={handleRegenerate}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();
  const prefs = getPreferenceValues<Preferences>();

  const {
    value: savedOptions,
    setValue: setSavedOptions,
    isLoading: isStorageLoading,
  } = useLocalStorage<GenerateOptions>(STORAGE_KEY, DEFAULT_OPTIONS);

  const current = savedOptions ?? DEFAULT_OPTIONS;
  const [countDraft, setCountDraft] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const countStr = countDraft ?? String(current.count);

  async function updateSaved(patch: Partial<GenerateOptions>) {
    await setSavedOptions({ ...current, ...patch });
  }

  async function runGeneration(pasteDirectly: boolean) {
    if (isGenerating || isStorageLoading) return;

    let parsedCount: number;
    try {
      parsedCount = parseCountArg(countStr, DEFAULT_OPTIONS.count);
    } catch (err) {
      await showFailureToast(err, { title: "Invalid count" });
      return;
    }

    const options: GenerateOptions = {
      ...current,
      count: parsedCount,
    };

    setIsGenerating(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating placeholder text...",
    });

    try {
      await setSavedOptions(options);
      setCountDraft(null);
      const { formattedText } = await generateText(prefs.apiUrl, options);

      if (pasteDirectly) {
        await toast.hide();
        await Clipboard.paste(formattedText);
        await showHUD("Pasted Prolixo text");
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Generated";
        push(<ResultDetail initialText={formattedText} options={options} apiUrl={prefs.apiUrl} />);
      }
    } catch (err) {
      await toast.hide();
      if (err instanceof ProlixoApiError && err.status === 429) {
        const message = err.retryAfter ? `Please try again in ${err.retryAfter} seconds.` : err.message;
        await showFailureToast(new Error(message), { title: "Rate limit exceeded" });
      } else {
        await showFailureToast(err, { title: "Generation failed" });
      }
    } finally {
      setIsGenerating(false);
    }
  }

  const isLatin = current.lang === "la";

  return (
    <Form
      isLoading={isGenerating || isStorageLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate & Preview"
            icon={Icon.Text}
            onSubmit={() => void runGeneration(false)}
          />
          <Action.SubmitForm
            title="Generate & Paste Directly"
            icon={Icon.Clipboard}
            onSubmit={() => void runGeneration(true)}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="lang"
        title="Language"
        value={current.lang}
        onChange={(val) => void updateSaved({ lang: val as LanguageCode })}
      >
        {LANGUAGES.map((item) => (
          <Form.Dropdown.Item key={item.code} value={item.code} title={item.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="type"
        title="Output Mode"
        value={current.type}
        onChange={(val) => void updateSaved({ type: val as OutputType })}
      >
        {OUTPUT_TYPES.map((item) => (
          <Form.Dropdown.Item key={item.code} value={item.code} title={item.name} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="count"
        title="Count (1–100)"
        value={countStr}
        onChange={setCountDraft}
        placeholder="3"
      />

      {isLatin ? (
        <Form.Description
          title="Domain & Precision"
          text="Classical Latin (Lorem Ipsum) uses a Markov generator and ignores domain themes and error injection."
        />
      ) : (
        <>
          <Form.Dropdown
            id="theme"
            title="Theme"
            value={current.theme}
            onChange={(val) => void updateSaved({ theme: val as ThemeCode })}
          >
            {THEMES.map((item) => (
              <Form.Dropdown.Item key={item.code} value={item.code} title={item.name} />
            ))}
          </Form.Dropdown>

          <Form.Checkbox
            id="grammar_correct"
            title="Linguistic Precision"
            label="Grammar Correct (disable to inject realistic grammar errors)"
            value={current.grammar_correct}
            onChange={(val) => void updateSaved({ grammar_correct: val })}
          />
          <Form.Checkbox
            id="orthography_correct"
            label="Orthography Correct (disable to inject realistic spelling errors)"
            value={current.orthography_correct}
            onChange={(val) => void updateSaved({ orthography_correct: val })}
          />
        </>
      )}
    </Form>
  );
}
