import {
  Action,
  ActionPanel,
  Form,
  Detail,
  AI,
  Icon,
  Image,
  useNavigation,
  LocalStorage,
  getSelectedText,
  getPreferenceValues,
  environment,
} from "@raycast/api";
import { useState, useEffect, useMemo, useRef } from "react";

// --- Types ---

interface ModelEntry {
  value: string;
  label: string;
}

export interface ProviderSection {
  name: string;
  icon: Image.ImageLike;
  models: ModelEntry[];
}

export interface LangDef {
  name: string;
  code: string;
  scriptPattern?: RegExp;
}

export type DetectMode = "fast" | "accurate";

interface HistoryEntry {
  id: string;
  originalText: string;
  sections: { key: string; text: string }[];
  baseName: string;
  targetName: string;
  modelName: string;
  timestamp: number;
}

interface Preferences {
  baseLang: string;
  targetLang: string;
  detectMode: DetectMode;
}

// --- Constants ---

const TONES = ["Polite", "Casual", "Business", "Slang"] as const;
const MODEL_KEY = "selectedModel";
const LAST_AUTO_KEY = "lastAutoText";
const HISTORY_KEY = "translationHistory";
const HISTORY_MAX = 50;
const DEFAULT_MODEL = "openai-gpt-4o";
const DETECT_MODEL_ACCURATE = "google-gemini-2.0-flash";

export const LANGUAGES: Record<string, LangDef> = {
  Arabic: { name: "Arabic", code: "AR", scriptPattern: /[\u0600-\u06FF]/ },
  Chinese: {
    name: "Chinese",
    code: "ZH",
    scriptPattern: /[\u4E00-\u9FFF\u3400-\u4DBF]/,
  },
  Dutch: { name: "Dutch", code: "NL" },
  English: { name: "English", code: "EN" },
  French: { name: "French", code: "FR" },
  German: { name: "German", code: "DE" },
  Hindi: { name: "Hindi", code: "HI", scriptPattern: /[\u0900-\u097F]/ },
  Indonesian: { name: "Indonesian", code: "ID" },
  Italian: { name: "Italian", code: "IT" },
  Japanese: {
    name: "Japanese",
    code: "JA",
    scriptPattern: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/,
  },
  Korean: {
    name: "Korean",
    code: "KO",
    scriptPattern: /[\uAC00-\uD7AF\u1100-\u11FF]/,
  },
  Polish: { name: "Polish", code: "PL" },
  Portuguese: { name: "Portuguese", code: "PT" },
  Russian: { name: "Russian", code: "RU", scriptPattern: /[\u0400-\u04FF]/ },
  Spanish: { name: "Spanish", code: "ES" },
  Swedish: { name: "Swedish", code: "SV" },
  Thai: { name: "Thai", code: "TH", scriptPattern: /[\u0E00-\u0E7F]/ },
  Turkish: { name: "Turkish", code: "TR" },
  Ukrainian: {
    name: "Ukrainian",
    code: "UK",
    scriptPattern: /[\u0400-\u04FF]/,
  },
  Vietnamese: { name: "Vietnamese", code: "VI" },
};

function getExtPrefs(): {
  base: LangDef;
  target: LangDef;
  detectMode: DetectMode;
} {
  const prefs = getPreferenceValues<Preferences>();
  return {
    base: LANGUAGES[prefs.baseLang] ?? LANGUAGES["Japanese"],
    target: LANGUAGES[prefs.targetLang] ?? LANGUAGES["English"],
    detectMode: prefs.detectMode ?? "fast",
  };
}

async function detectLanguageAccurate(text: string): Promise<string> {
  const snippet = text.length > 200 ? text.slice(0, 200) : text;
  const prompt = `What language is the following text written in? Reply with ONLY the language name in English (e.g. "Japanese", "English", "Vietnamese"). Nothing else.\n\n${snippet}`;
  const result = await AI.ask(prompt, {
    creativity: "none",
    model: DETECT_MODEL_ACCURATE as AI.Model,
  });
  return result.trim();
}

async function detectIsBase(
  text: string,
  base: LangDef,
  target: LangDef,
  mode: DetectMode,
): Promise<boolean> {
  if (mode === "fast") {
    if (base.scriptPattern) return base.scriptPattern.test(text);
    if (target.scriptPattern) return !target.scriptPattern.test(text);
  }
  const detected = await detectLanguageAccurate(text);
  return detected.toLowerCase() === base.name.toLowerCase();
}

async function saveHistory(
  originalText: string,
  raw: string,
  base: LangDef,
  target: LangDef,
  modelName: string,
  inputIsBase: boolean,
) {
  const keys = inputIsBase ? [...TONES] : [base.name, ...TONES];
  const sections = keys.map((key) => ({ key, text: extractSection(raw, key) }));
  const entry: HistoryEntry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    originalText,
    sections,
    baseName: base.name,
    targetName: target.name,
    modelName,
    timestamp: Date.now(),
  };
  const histRaw = await LocalStorage.getItem<string>(HISTORY_KEY);
  const history: HistoryEntry[] = histRaw ? JSON.parse(histRaw) : [];
  history.unshift(entry);
  if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function favicon(domain: string): Image.ImageLike {
  return {
    source: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    mask: Image.Mask.RoundedRectangle,
  };
}

const PROVIDER_DEFS: {
  prefix: string;
  name: string;
  icon: Image.ImageLike;
  models: ModelEntry[];
}[] = [
  {
    prefix: "OpenAI_",
    name: "OpenAI",
    icon: favicon("openai.com"),
    models: [
      { value: "openai_o1-o3-mini", label: "o3 mini" },
      { value: "openai_o1-o1", label: "o1" },
      { value: "openai_o1-o1-preview", label: "o1 preview" },
      { value: "openai_o1-o1-mini", label: "o1 mini" },
      { value: "openai-gpt-4o", label: "GPT-4o" },
      { value: "openai-gpt-4o-mini", label: "GPT-4o mini" },
      { value: "openai-gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "openai-gpt-4", label: "GPT-4" },
    ],
  },
  {
    prefix: "Anthropic_",
    name: "Anthropic",
    icon: favicon("anthropic.com"),
    models: [
      { value: "anthropic-claude-opus", label: "Claude Opus" },
      { value: "anthropic-claude-sonnet", label: "Claude Sonnet" },
      { value: "anthropic-claude-haiku", label: "Claude Haiku" },
    ],
  },
  {
    prefix: "Google_",
    name: "Google",
    icon: favicon("deepmind.google"),
    models: [
      {
        value: "google-gemini-2.0-flash-thinking",
        label: "Gemini 2.0 Flash Thinking",
      },
      { value: "google-gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { value: "google-gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { value: "google-gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    ],
  },
  {
    prefix: "xAI_",
    name: "xAI",
    icon: favicon("x.ai"),
    models: [{ value: "xai-grok-2-latest", label: "Grok 2" }],
  },
  {
    prefix: "DeepSeek_",
    name: "DeepSeek",
    icon: favicon("deepseek.com"),
    models: [
      { value: "together-deepseek-ai/DeepSeek-R1", label: "DeepSeek R1" },
      {
        value: "groq-deepseek-r1-distill-llama-70b",
        label: "DeepSeek R1 Distill Llama 70B",
      },
    ],
  },
  {
    prefix: "Mistral_",
    name: "Mistral",
    icon: favicon("mistral.ai"),
    models: [
      { value: "mistral-large", label: "Mistral Large" },
      { value: "mistral-small", label: "Mistral Small" },
      { value: "mistral-codestral", label: "Codestral" },
      { value: "mistral-nemo", label: "Mistral Nemo" },
      { value: "mixtral-8x7b", label: "Mixtral 8x7B" },
    ],
  },
  {
    prefix: "Llama",
    name: "Meta",
    icon: favicon("meta.com"),
    models: [
      { value: "groq-llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { value: "llama3.1-405b", label: "Llama 3.1 405B" },
      { value: "llama3.1-8b", label: "Llama 3.1 8B" },
      { value: "llama3-70b", label: "Llama 3 70B" },
    ],
  },
  {
    prefix: "Perplexity_",
    name: "Perplexity",
    icon: favicon("perplexity.ai"),
    models: [
      { value: "perplexity-sonar-reasoning-pro", label: "Sonar Reasoning Pro" },
      { value: "perplexity-sonar-reasoning", label: "Sonar Reasoning" },
      { value: "perplexity-sonar-pro", label: "Sonar Pro" },
      { value: "perplexity-sonar", label: "Sonar" },
    ],
  },
];

// --- Model discovery ---

export function getModelSections(): ProviderSection[] {
  try {
    const entries = Object.entries(AI.Model);
    if (entries.length > 0) {
      const seen = new Set<string>();
      const dynamicModels: { key: string; value: string; label: string }[] = [];

      for (const [key, value] of entries) {
        if (!seen.has(value)) {
          seen.add(value);
          dynamicModels.push({ key, value, label: key.replace(/_/g, " ") });
        }
      }

      const sections: ProviderSection[] = [];
      const assigned = new Set<string>();

      for (const provider of PROVIDER_DEFS) {
        const models = dynamicModels.filter(
          (m) => m.key.startsWith(provider.prefix) && !assigned.has(m.value),
        );
        if (models.length === 0) continue;
        models.forEach((m) => assigned.add(m.value));
        models.reverse();
        sections.push({ name: provider.name, icon: provider.icon, models });
      }

      const rest = dynamicModels.filter((m) => !assigned.has(m.value));
      if (rest.length > 0) {
        rest.reverse();
        sections.push({ name: "Other", icon: Icon.ComputerChip, models: rest });
      }

      if (sections.length > 0) return sections;
    }
  } catch {
    // AI.Model may not be iterable at runtime
  }

  return PROVIDER_DEFS.map((p) => ({
    name: p.name,
    icon: p.icon,
    models: p.models,
  }));
}

// --- Prompt & parsing ---

function buildPrompt(
  text: string,
  base: LangDef,
  target: LangDef,
  inputIsBase: boolean,
): string {
  if (inputIsBase) {
    return `You are a professional translator.
Translate the following ${base.name} text into ${target.name}. Provide 4 tone variations.
Do NOT wrap any output in quotes.

Input text:
${text}

Respond in EXACTLY this format:

## Polite

## Casual

## Business

## Slang`;
  }

  return `You are a professional translator.
Translate the following text:
1. Into ${base.name} — write under "## ${base.name}"
2. Into ${target.name} in 4 tones — write under ## Polite, ## Casual, ## Business, ## Slang

All 4 tones MUST be in ${target.name}.
Do NOT wrap any output in quotes.

Input text:
${text}

Respond in EXACTLY this format:

## ${base.name}

## Polite

## Casual

## Business

## Slang`;
}

function extractSection(raw: string, key: string): string {
  const regex = new RegExp(`##\\s*${key}[\\t ]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`);
  return raw.match(regex)?.[1]?.trim() ?? "";
}

function getResultKeys(base: LangDef, inputIsBase: boolean): string[] {
  return inputIsBase ? [...TONES] : [base.name, ...TONES];
}

// --- Loading skeleton ---

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function LoadingDetail({
  text,
  base,
  target,
  modelName,
}: {
  text: string;
  base: LangDef;
  target: LangDef;
  modelName?: string;
}) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => f + 1), 80);
    return () => clearInterval(id);
  }, []);

  const spinner = SPINNER[frame % SPINNER.length];
  const quoted = text
    .split(/[\r\n\u2028\u2029]/)
    .map((line) => `> ${line.replace(/([*_`[\]\\#~|])/g, "\\$1")}`)
    .join("\n");
  const markdown = `${spinner} Translating...\n\n${quoted}`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Original" text={text} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Languages"
            text={`${base.name} ↔ ${target.name}`}
          />
          {modelName && (
            <Detail.Metadata.Label title="Model" text={modelName} />
          )}
        </Detail.Metadata>
      }
    />
  );
}

// --- Components ---

function ResultView({
  raw,
  originalText,
  modelName,
  base,
  target,
  inputIsBase,
  isStreaming,
  modelSections,
  currentModel,
  onChangeModel,
}: {
  raw: string;
  originalText: string;
  modelName: string;
  base: LangDef;
  target: LangDef;
  inputIsBase: boolean;
  isStreaming: boolean;
  modelSections?: ProviderSection[];
  currentModel?: string;
  onChangeModel?: (model: string, modelName: string) => void;
}) {
  const keys = getResultKeys(base, inputIsBase);

  const parsed = keys.map((key) => ({
    key,
    text: extractSection(raw, key),
  }));

  const allEmpty = parsed.every(({ text }) => text === "");
  const parsedMarkdown = allEmpty
    ? raw
    : parsed.map(({ key, text }) => `### ${key}\n${text}`).join("\n\n---\n\n");

  // While streaming, render the raw text as-is (with `## Heading` levels normalized
  // to `###` so the heading size doesn't jump when we switch to the parsed view).
  const streamingMarkdown = raw.replace(/^##\s+/gm, "### ");
  const markdown = isStreaming ? streamingMarkdown : parsedMarkdown;

  return (
    <Detail
      markdown={markdown}
      isLoading={isStreaming}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Original" text={originalText} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Languages"
            text={`${base.name} ↔ ${target.name}`}
          />
          <Detail.Metadata.Label title="Model" text={modelName} />
        </Detail.Metadata>
      }
      actions={
        isStreaming ? undefined : (
          <ActionPanel>
            {parsed.map(({ key, text }) => {
              const toneIndex = TONES.indexOf(key as (typeof TONES)[number]);
              return (
                <Action.CopyToClipboard
                  key={key}
                  title={`Copy ${key}`}
                  content={text}
                  shortcut={
                    toneIndex >= 0
                      ? {
                          modifiers: ["cmd"],
                          key: String(toneIndex + 1) as "1" | "2" | "3" | "4",
                        }
                      : undefined
                  }
                />
              );
            })}
            <Action.CopyToClipboard
              title="Copy All"
              content={parsedMarkdown}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            {modelSections && onChangeModel && (
              <ActionPanel.Submenu
                title="Change Model"
                icon={Icon.Switch}
                shortcut={{ modifiers: ["cmd"], key: "m" }}
              >
                {modelSections.map((section) =>
                  section.models.map((m) => (
                    <Action
                      key={m.value}
                      title={`${section.name}: ${m.label}${m.value === currentModel ? "  ✓" : ""}`}
                      icon={section.icon}
                      onAction={() => onChangeModel(m.value, m.label)}
                    />
                  )),
                )}
              </ActionPanel.Submenu>
            )}
          </ActionPanel>
        )
      }
    />
  );
}

/**
 * Used ONLY for manual translation (form submit → push).
 * ESC naturally pops back to the Form.
 */
export function TranslateScreen({
  text,
  initialModel,
  initialModelName,
  base,
  target,
  detectMode,
  modelSections,
  initialIsBase,
}: {
  text: string;
  initialModel: string;
  initialModelName: string;
  base: LangDef;
  target: LangDef;
  detectMode: DetectMode;
  modelSections: ProviderSection[];
  initialIsBase?: boolean;
}) {
  const [raw, setRaw] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentModel, setCurrentModel] = useState(initialModel);
  const [currentModelName, setCurrentModelName] = useState(initialModelName);
  const [inputIsBase, setInputIsBase] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRaw(null);
    setError(false);
    setIsStreaming(true);
    (async () => {
      try {
        const isBase =
          initialIsBase !== undefined
            ? initialIsBase
            : await detectIsBase(text, base, target, detectMode);
        if (cancelled) return;
        setInputIsBase(isBase);
        const prompt = buildPrompt(text, base, target, isBase);
        const answer = AI.ask(prompt, {
          creativity: "low",
          model: currentModel as AI.Model,
        });
        let accumulated = "";
        answer.on("data", (chunk: string) => {
          if (cancelled) return;
          accumulated += chunk;
          setRaw(accumulated);
        });
        const response = await answer;
        if (!cancelled) {
          setRaw(response);
          setIsStreaming(false);
          saveHistory(text, response, base, target, currentModelName, isBase);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setIsStreaming(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentModel]);

  function handleChangeModel(model: string, name: string) {
    setCurrentModel(model);
    setCurrentModelName(name);
    LocalStorage.setItem(MODEL_KEY, model);
  }

  if (error) {
    return <Detail markdown="**Translation failed.** Please try again." />;
  }

  if (raw !== null) {
    return (
      <ResultView
        raw={raw}
        originalText={text}
        modelName={currentModelName}
        base={base}
        target={target}
        inputIsBase={inputIsBase}
        isStreaming={isStreaming}
        modelSections={modelSections}
        currentModel={currentModel}
        onChangeModel={handleChangeModel}
      />
    );
  }

  return (
    <LoadingDetail
      text={text}
      base={base}
      target={target}
      modelName={currentModelName}
    />
  );
}

export default function Command() {
  if (!environment.canAccess(AI)) {
    return (
      <Detail
        markdown={
          "# Raycast Pro Required\n\n" +
          "Smart Translator uses Raycast AI, which requires a Raycast Pro subscription.\n\n" +
          "Learn more at [raycast.com/pro](https://www.raycast.com/pro)."
        }
      />
    );
  }

  const { push } = useNavigation();
  const { base, target, detectMode } = getExtPrefs();
  const modelSections = useMemo(() => getModelSections(), []);
  const allModels = useMemo(
    () => modelSections.flatMap((s) => s.models),
    [modelSections],
  );
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [initDone, setInitDone] = useState(false);

  // Auto-translate state (rendered directly, no push)
  const [autoText, setAutoText] = useState<string | null>(null);
  const [autoResult, setAutoResult] = useState<{
    raw: string;
    modelName: string;
    inputIsBase: boolean;
    isStreaming: boolean;
  } | null>(null);
  const [autoError, setAutoError] = useState(false);
  const autoRequestIdRef = useRef(0);

  useEffect(() => {
    Promise.all([
      LocalStorage.getItem<string>(MODEL_KEY),
      LocalStorage.getItem<string>(LAST_AUTO_KEY),
      getSelectedText().catch(() => ""),
    ]).then(([saved, lastAuto, selected]) => {
      const model =
        saved && allModels.some((m) => m.value === saved)
          ? saved
          : (allModels[0]?.value ?? DEFAULT_MODEL);
      setSelectedModel(model);
      setInitDone(true);

      const text = selected.trim();
      if (text && text !== lastAuto) {
        const modelName =
          allModels.find((m) => m.value === model)?.label ?? model;
        setAutoText(text);
        LocalStorage.setItem(LAST_AUTO_KEY, text);

        const myId = ++autoRequestIdRef.current;
        (async () => {
          try {
            const isBase = await detectIsBase(text, base, target, detectMode);
            if (autoRequestIdRef.current !== myId) return;
            const prompt = buildPrompt(text, base, target, isBase);
            const answer = AI.ask(prompt, {
              creativity: "low",
              model: model as AI.Model,
            });
            let accumulated = "";
            answer.on("data", (chunk: string) => {
              if (autoRequestIdRef.current !== myId) return;
              accumulated += chunk;
              setAutoResult({
                raw: accumulated,
                modelName,
                inputIsBase: isBase,
                isStreaming: true,
              });
            });
            const response = await answer;
            if (autoRequestIdRef.current !== myId) return;
            setAutoResult({
              raw: response,
              modelName,
              inputIsBase: isBase,
              isStreaming: false,
            });
            saveHistory(text, response, base, target, modelName, isBase);
          } catch {
            if (autoRequestIdRef.current !== myId) return;
            setAutoError(true);
          }
        })();
      }
    });
  }, [allModels]);

  // --- Auto-translate: root renders directly, no navigation stack ---

  if (autoText && autoError) {
    return <Detail markdown="**Translation failed.** Please try again." />;
  }

  if (autoText && autoResult) {
    const handleAutoChangeModel = (model: string, name: string) => {
      setSelectedModel(model);
      LocalStorage.setItem(MODEL_KEY, model);
      setAutoResult(null);
      const myId = ++autoRequestIdRef.current;
      (async () => {
        try {
          const isBase = await detectIsBase(autoText, base, target, detectMode);
          if (autoRequestIdRef.current !== myId) return;
          const prompt = buildPrompt(autoText, base, target, isBase);
          const answer = AI.ask(prompt, {
            creativity: "low",
            model: model as AI.Model,
          });
          let accumulated = "";
          answer.on("data", (chunk: string) => {
            if (autoRequestIdRef.current !== myId) return;
            accumulated += chunk;
            setAutoResult({
              raw: accumulated,
              modelName: name,
              inputIsBase: isBase,
              isStreaming: true,
            });
          });
          const response = await answer;
          if (autoRequestIdRef.current !== myId) return;
          setAutoResult({
            raw: response,
            modelName: name,
            inputIsBase: isBase,
            isStreaming: false,
          });
          saveHistory(autoText, response, base, target, name, isBase);
        } catch {
          if (autoRequestIdRef.current !== myId) return;
          setAutoError(true);
        }
      })();
    };

    return (
      <ResultView
        raw={autoResult.raw}
        originalText={autoText}
        modelName={autoResult.modelName}
        base={base}
        target={target}
        inputIsBase={autoResult.inputIsBase}
        isStreaming={autoResult.isStreaming}
        modelSections={modelSections}
        currentModel={selectedModel}
        onChangeModel={handleAutoChangeModel}
      />
    );
  }

  if (autoText) {
    return (
      <LoadingDetail
        text={autoText}
        base={base}
        target={target}
        modelName={allModels.find((m) => m.value === selectedModel)?.label}
      />
    );
  }

  // --- Init: show loading until we know if there's selected text ---

  if (!initDone) {
    return <Detail isLoading={true} />;
  }

  // --- Manual: form + push ---

  function handleModelChange(value: string) {
    setSelectedModel(value);
    LocalStorage.setItem(MODEL_KEY, value);
  }

  async function handleSubmit(values: { text: string }) {
    if (!values.text.trim()) return;
    const modelName =
      allModels.find((m) => m.value === selectedModel)?.label ?? selectedModel;
    push(
      <TranslateScreen
        text={values.text.trim()}
        initialModel={selectedModel}
        initialModelName={modelName}
        base={base}
        target={target}
        detectMode={detectMode}
        modelSections={modelSections}
      />,
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Translate"
            onSubmit={handleSubmit}
            icon={Icon.ArrowRight}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text"
        placeholder={`Enter ${base.name} or ${target.name} text...`}
      />
      {selectedModel !== "" && (
        <Form.Dropdown
          id="model"
          title="AI Model"
          value={selectedModel}
          onChange={handleModelChange}
        >
          {modelSections.map((section) => (
            <Form.Dropdown.Section key={section.name} title={section.name}>
              {section.models.map((m) => (
                <Form.Dropdown.Item
                  key={m.value}
                  value={m.value}
                  title={m.label}
                  icon={section.icon}
                />
              ))}
            </Form.Dropdown.Section>
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
