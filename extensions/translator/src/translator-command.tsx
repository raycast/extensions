import {
  Clipboard,
  Detail,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ErrorView,
  TranslationFormView,
  TranslationResultView,
} from "./components/translator-views";
import { getErrorMessage } from "./services/error-utils";
import {
  detectLanguageFromText,
  inferDefaultTargetLanguage,
} from "./services/language";
import {
  buildTranslatorSystemPrompt,
  buildTranslatorUserPrompt,
} from "./services/prompt-builder";
import { readProfileStore } from "./services/profile-store";
import { dispatchTranslationWithFallback } from "./services/translation-dispatcher";
import { isSupportedLanguage, SupportedLanguage } from "./types/language";
import { ProfileStoreData } from "./types/profile";
import { SubmitTranslationInput, TranslationResult } from "./types/translation";

interface LoadedRuntime {
  defaultTargetLanguage: SupportedLanguage;
  profileStore: ProfileStoreData;
}

interface LoadedRuntimeState {
  runtime: LoadedRuntime | null;
  error: string | null;
  isLoading: boolean;
}

export interface TranslatorCommandProps {
  prefillSource?: "none" | "clipboard";
  autoSubmitOnPrefill?: boolean;
}

function parseDefaultTargetLanguage(value: string): SupportedLanguage {
  if (!isSupportedLanguage(value)) {
    throw new Error("Default target language must be one of zh, ja, en.");
  }

  return value;
}

async function loadRuntime(): Promise<LoadedRuntime> {
  const preferences = getPreferenceValues<Preferences>();
  const defaultTargetLanguage = parseDefaultTargetLanguage(
    preferences.defaultTargetLanguage,
  );
  const profileStore = await readProfileStore();
  if (!profileStore.profiles.length) {
    throw new Error(
      "No API profiles found. Open 'Manage API Profiles' command to add one.",
    );
  }

  return { defaultTargetLanguage, profileStore };
}

function resolveSourceLanguage(
  text: string,
  autoDetectSource: boolean,
  manualSourceLanguage: SupportedLanguage,
): SupportedLanguage {
  if (autoDetectSource) {
    return detectLanguageFromText(text);
  }

  return manualSourceLanguage;
}

function resolveTargetLanguage(
  sourceLanguage: SupportedLanguage,
  selectedTargetLanguage: SupportedLanguage,
  isTargetManuallySelected: boolean,
): SupportedLanguage {
  if (isTargetManuallySelected) {
    return selectedTargetLanguage;
  }

  return inferDefaultTargetLanguage(sourceLanguage);
}

function useRuntimeState() {
  const [state, setState] = useState<LoadedRuntimeState>({
    runtime: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    let isActive = true;
    const run = async () => {
      try {
        const runtime = await loadRuntime();
        if (isActive) {
          setState({ runtime, error: null, isLoading: false });
        }
      } catch (error) {
        if (isActive) {
          setState({
            runtime: null,
            error: getErrorMessage(error),
            isLoading: false,
          });
        }
      }
    };

    void run();
    return () => {
      isActive = false;
    };
  }, []);

  return state;
}

function useTranslationSubmission(runtime: LoadedRuntime) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);

  const submit = useCallback(
    async (input: SubmitTranslationInput) => {
      const systemPrompt = buildTranslatorSystemPrompt(input.targetLanguage);
      const userPrompt = buildTranslatorUserPrompt(
        input.text,
        input.sourceLanguage,
        input.targetLanguage,
      );
      setIsSubmitting(true);

      try {
        const dispatchResult = await dispatchTranslationWithFallback({
          profiles: runtime.profileStore.profiles,
          defaultProfileId: runtime.profileStore.defaultProfileId,
          request: { systemPrompt, userPrompt },
        });

        setResult({
          ...input,
          translatedText: dispatchResult.translatedText,
          usedProfileName: dispatchResult.usedProfileName,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Translation failed",
          message: getErrorMessage(error),
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [runtime.profileStore.defaultProfileId, runtime.profileStore.profiles],
  );

  return { isSubmitting, result, resetResult: () => setResult(null), submit };
}

function useClipboardPrefill(params: {
  enabled: boolean;
  autoSubmitOnPrefill: boolean;
  setText: (text: string) => void;
  submitFromText: (text: string) => Promise<void>;
}) {
  const { enabled, autoSubmitOnPrefill, setText, submitFromText } = params;
  const hasPrefilledRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasPrefilledRef.current) {
      return;
    }

    hasPrefilledRef.current = true;
    const run = async () => {
      const clipboardText = await Clipboard.readText();
      const trimmedText = clipboardText?.trim();
      if (!trimmedText) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Clipboard is empty.",
        });
        return;
      }

      setText(trimmedText);
      if (autoSubmitOnPrefill) {
        await submitFromText(trimmedText);
      }
    };

    void run();
  }, [enabled, autoSubmitOnPrefill, setText, submitFromText]);
}

function useTranslatorFormState(defaultTargetLanguage: SupportedLanguage) {
  const [text, setText] = useState("");
  const [autoDetectSource, setAutoDetectSource] = useState(true);
  const [manualSourceLanguage, setManualSourceLanguage] =
    useState<SupportedLanguage>("zh");
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>(
    defaultTargetLanguage,
  );
  const [isTargetManuallySelected, setIsTargetManuallySelected] =
    useState(false);

  return {
    text,
    setText,
    autoDetectSource,
    setAutoDetectSource,
    manualSourceLanguage,
    setManualSourceLanguage,
    targetLanguage,
    setTargetLanguage,
    isTargetManuallySelected,
    setIsTargetManuallySelected,
  };
}

function useSubmitFromText(params: {
  autoDetectSource: boolean;
  manualSourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  isTargetManuallySelected: boolean;
  setTargetLanguage: (language: SupportedLanguage) => void;
  submit: (input: SubmitTranslationInput) => Promise<void>;
}) {
  const {
    autoDetectSource,
    manualSourceLanguage,
    targetLanguage,
    isTargetManuallySelected,
    setTargetLanguage,
    submit,
  } = params;

  return useCallback(
    async (sourceText: string) => {
      const trimmedText = sourceText.trim();
      if (!trimmedText) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Text is required.",
        });
        return;
      }

      const sourceLanguage = resolveSourceLanguage(
        trimmedText,
        autoDetectSource,
        manualSourceLanguage,
      );
      const finalTargetLanguage = resolveTargetLanguage(
        sourceLanguage,
        targetLanguage,
        isTargetManuallySelected,
      );
      setTargetLanguage(finalTargetLanguage);
      await submit({
        text: trimmedText,
        sourceLanguage,
        targetLanguage: finalTargetLanguage,
      });
    },
    [
      autoDetectSource,
      isTargetManuallySelected,
      manualSourceLanguage,
      setTargetLanguage,
      submit,
      targetLanguage,
    ],
  );
}

function useLanguageFieldHandlers(params: {
  setTargetLanguage: (language: SupportedLanguage) => void;
  setIsTargetManuallySelected: (selected: boolean) => void;
  setManualSourceLanguage: (language: SupportedLanguage) => void;
}) {
  const {
    setTargetLanguage,
    setIsTargetManuallySelected,
    setManualSourceLanguage,
  } = params;

  const handleTargetLanguageChange = useCallback(
    (value: string) => {
      if (isSupportedLanguage(value)) {
        setTargetLanguage(value);
        setIsTargetManuallySelected(true);
      }
    },
    [setIsTargetManuallySelected, setTargetLanguage],
  );

  const handleManualSourceLanguageChange = useCallback(
    (value: string) => {
      if (isSupportedLanguage(value)) {
        setManualSourceLanguage(value);
      }
    },
    [setManualSourceLanguage],
  );

  return { handleTargetLanguageChange, handleManualSourceLanguageChange };
}

function useAutoTargetLanguage(params: {
  text: string;
  autoDetectSource: boolean;
  isTargetManuallySelected: boolean;
  setTargetLanguage: (language: SupportedLanguage) => void;
}) {
  const {
    text,
    autoDetectSource,
    isTargetManuallySelected,
    setTargetLanguage,
  } = params;

  useEffect(() => {
    if (!autoDetectSource || isTargetManuallySelected || !text.trim()) {
      return;
    }

    const detectedSourceLanguage = detectLanguageFromText(text);
    setTargetLanguage(inferDefaultTargetLanguage(detectedSourceLanguage));
  }, [autoDetectSource, isTargetManuallySelected, setTargetLanguage, text]);
}

function useTranslatorCommandInnerState(params: {
  runtime: LoadedRuntime;
  prefillSource: "none" | "clipboard";
  autoSubmitOnPrefill: boolean;
}) {
  const { runtime, prefillSource, autoSubmitOnPrefill } = params;
  const state = useTranslatorFormState(runtime.defaultTargetLanguage);
  const { isSubmitting, result, resetResult, submit } =
    useTranslationSubmission(runtime);

  useAutoTargetLanguage({
    text: state.text,
    autoDetectSource: state.autoDetectSource,
    isTargetManuallySelected: state.isTargetManuallySelected,
    setTargetLanguage: state.setTargetLanguage,
  });

  const submitFromText = useSubmitFromText({
    autoDetectSource: state.autoDetectSource,
    manualSourceLanguage: state.manualSourceLanguage,
    targetLanguage: state.targetLanguage,
    isTargetManuallySelected: state.isTargetManuallySelected,
    setTargetLanguage: state.setTargetLanguage,
    submit,
  });

  useClipboardPrefill({
    enabled: prefillSource === "clipboard",
    autoSubmitOnPrefill,
    setText: state.setText,
    submitFromText,
  });
  const handlers = useLanguageFieldHandlers({
    setTargetLanguage: state.setTargetLanguage,
    setIsTargetManuallySelected: state.setIsTargetManuallySelected,
    setManualSourceLanguage: state.setManualSourceLanguage,
  });

  const handleSubmit = useCallback(
    async () => submitFromText(state.text),
    [state.text, submitFromText],
  );
  return { state, handlers, isSubmitting, result, resetResult, handleSubmit };
}

function TranslatorCommandInner(props: {
  runtime: LoadedRuntime;
  prefillSource: "none" | "clipboard";
  autoSubmitOnPrefill: boolean;
}) {
  const { state, handlers, isSubmitting, result, resetResult, handleSubmit } =
    useTranslatorCommandInnerState(props);
  if (result) {
    return <TranslationResultView result={result} onBack={resetResult} />;
  }

  return (
    <TranslationFormView
      text={state.text}
      targetLanguage={state.targetLanguage}
      autoDetectSource={state.autoDetectSource}
      manualSourceLanguage={state.manualSourceLanguage}
      isSubmitting={isSubmitting}
      onTextChange={state.setText}
      onTargetLanguageChange={handlers.handleTargetLanguageChange}
      onAutoDetectSourceChange={state.setAutoDetectSource}
      onManualSourceLanguageChange={handlers.handleManualSourceLanguageChange}
      onSubmit={handleSubmit}
    />
  );
}

export default function TranslatorCommand(props: TranslatorCommandProps) {
  const prefillSource = props.prefillSource ?? "none";
  const autoSubmitOnPrefill = props.autoSubmitOnPrefill ?? false;
  const runtimeState = useRuntimeState();

  if (runtimeState.isLoading) {
    return <Detail isLoading={true} markdown="Loading translator..." />;
  }

  if (runtimeState.error || !runtimeState.runtime) {
    return (
      <ErrorView
        message={runtimeState.error ?? "Failed to load translator runtime."}
      />
    );
  }

  return (
    <TranslatorCommandInner
      runtime={runtimeState.runtime}
      prefillSource={prefillSource}
      autoSubmitOnPrefill={autoSubmitOnPrefill}
    />
  );
}
