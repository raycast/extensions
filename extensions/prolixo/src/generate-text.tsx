import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  LocalStorage,
  Toast,
  getPreferenceValues,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
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

interface Preferences {
  apiUrl?: string;
}

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
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to regenerate";
      toast.message = err instanceof Error ? err.message : String(err);
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

  const [lang, setLang] = useState<LanguageCode>(DEFAULT_OPTIONS.lang);
  const [outputType, setOutputType] = useState<OutputType>(DEFAULT_OPTIONS.type);
  const [theme, setTheme] = useState<ThemeCode>(DEFAULT_OPTIONS.theme);
  const [countStr, setCountStr] = useState<string>(String(DEFAULT_OPTIONS.count));
  const [grammarCorrect, setGrammarCorrect] = useState<boolean>(DEFAULT_OPTIONS.grammar_correct);
  const [orthographyCorrect, setOrthographyCorrect] = useState<boolean>(
    DEFAULT_OPTIONS.orthography_correct,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    async function loadSaved() {
      const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as Partial<GenerateOptions>;
        if (saved.lang) setLang(saved.lang);
        if (saved.type) setOutputType(saved.type);
        if (saved.theme) setTheme(saved.theme);
        if (typeof saved.count === "number") setCountStr(String(saved.count));
        if (typeof saved.grammar_correct === "boolean") setGrammarCorrect(saved.grammar_correct);
        if (typeof saved.orthography_correct === "boolean") {
          setOrthographyCorrect(saved.orthography_correct);
        }
      } catch {
        // Ignore corrupted local storage
      }
    }
    void loadSaved();
  }, []);

  async function runGeneration(pasteDirectly: boolean) {
    if (isLoading) return;

    let parsedCount: number;
    try {
      parsedCount = parseCountArg(countStr, DEFAULT_OPTIONS.count);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid count",
        message: err instanceof Error ? err.message : "Please enter a number between 1 and 100.",
      });
      return;
    }

    const options: GenerateOptions = {
      lang,
      type: outputType,
      theme,
      count: parsedCount,
      grammar_correct: grammarCorrect,
      orthography_correct: orthographyCorrect,
    };

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating placeholder text...",
    });

    try {
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(options));
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
    } finally {
      setIsLoading(false);
    }
  }

  const isLatin = lang === "la";

  return (
    <Form
      isLoading={isLoading}
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
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            onSubmit={() => void runGeneration(true)}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="lang"
        title="Language"
        value={lang}
        onChange={(val) => setLang(val as LanguageCode)}
      >
        {LANGUAGES.map((item) => (
          <Form.Dropdown.Item key={item.code} value={item.code} title={item.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="type"
        title="Output Mode"
        value={outputType}
        onChange={(val) => setOutputType(val as OutputType)}
      >
        {OUTPUT_TYPES.map((item) => (
          <Form.Dropdown.Item key={item.code} value={item.code} title={item.name} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="count"
        title="Count (1–100)"
        value={countStr}
        onChange={setCountStr}
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
            value={theme}
            onChange={(val) => setTheme(val as ThemeCode)}
          >
            {THEMES.map((item) => (
              <Form.Dropdown.Item key={item.code} value={item.code} title={item.name} />
            ))}
          </Form.Dropdown>

          <Form.Checkbox
            id="grammar_correct"
            title="Linguistic Precision"
            label="Grammar Correct (disable to inject realistic grammar errors)"
            value={grammarCorrect}
            onChange={setGrammarCorrect}
          />
          <Form.Checkbox
            id="orthography_correct"
            label="Orthography Correct (disable to inject realistic spelling errors)"
            value={orthographyCorrect}
            onChange={setOrthographyCorrect}
          />
        </>
      )}
    </Form>
  );
}
