import { Action, ActionPanel, Form, LocalStorage, popToRoot, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { isModelDownloaded } from "./utils/whisper-local";
import { LANGUAGE_OPTIONS } from "./constants";

export const DICTATE_TARGET_LANG_KEY = "dictate-target-language";
export const WHISPER_MODE_KEY = "whisper-mode";
export const WHISPER_MODEL_KEY = "whisper-model";
export const EXPERIMENTAL_SINGLE_CALL_KEY = "experimental-single-call";
export const PRIMARY_LANG_KEY = "primary-language";
export const SECONDARY_LANG_KEY = "secondary-language";
export const LLM_MODEL_KEY = "llm-model";
export const FIX_TEXT_KEY = "fix-text";
export const SHOW_EXPLORE_MORE_KEY = "show-explore-more";
export const SILENCE_TIMEOUT_KEY = "silence-timeout";
export const USE_PERSONAL_DICTIONARY_KEY = "use-personal-dictionary";
export const MUTE_DURING_DICTATION_KEY = "mute-during-dictation";
export const USE_CACHE_KEY = "use-cache";

const WHISPER_MODE_OPTIONS = [
  { value: "online", title: "Online (OpenAI API)" },
  { value: "local", title: "Local (Faster, Offline)" },
];

const WHISPER_MODEL_OPTIONS = [
  { value: "tiny", title: "Tiny (Fast, Less Accurate)", isDownloaded: false },
  { value: "base", title: "Base (Balanced)", isDownloaded: false },
  { value: "small", title: "Small (More Accurate)", isDownloaded: false },
  { value: "medium", title: "Medium (Most Accurate)", isDownloaded: false },
];

const MODEL_OPTIONS = [
  { value: "gpt-4o", title: "GPT-4o (Most Capable)" },
  { value: "gpt-4o-mini", title: "GPT-4o Mini (Fastest/Recommended)" },
  { value: "o1", title: "o1 (Most Powerful reasoning model)" },
  { value: "o1-mini", title: "o1-mini (Smaller reasoning model)" },
];

export default function Command() {
  const [targetLanguage, setTargetLanguage] = useState<string>("auto");
  const [primaryLanguage, setPrimaryLanguage] = useState<string>("en");
  const [secondaryLanguage, setSecondaryLanguage] = useState<string>("fr");
  const [llmModel, setLlmModel] = useState<string>("gpt-4o-mini");
  const [whisperMode, setWhisperMode] = useState<string>("online");
  const [whisperModel, setWhisperModel] = useState<string>("base");
  const [fixText, setFixText] = useState<boolean>(true);
  const [showExploreMore, setShowExploreMore] = useState<boolean>(true);
  const [experimentalSingleCall, setExperimentalSingleCall] = useState<boolean>(false);
  const [silenceTimeout, setSilenceTimeout] = useState<string>("2.0");
  const [usePersonalDictionary, setUsePersonalDictionary] = useState<boolean>(false);
  const [useCache, setUseCache] = useState<boolean>(true);
  const [muteDuringDictation, setMuteDuringDictation] = useState<boolean>(true);

  useEffect(() => {
    // Load all saved preferences
    const loadSettings = async () => {
      const savedTargetLang = await LocalStorage.getItem<string>(DICTATE_TARGET_LANG_KEY);
      const savedPrimaryLang = await LocalStorage.getItem<string>(PRIMARY_LANG_KEY);
      const savedSecondaryLang = await LocalStorage.getItem<string>(SECONDARY_LANG_KEY);
      const savedWhisperMode = await LocalStorage.getItem<string>(WHISPER_MODE_KEY);
      const savedWhisperModel = await LocalStorage.getItem<string>(WHISPER_MODEL_KEY);
      const savedLlmModel = await LocalStorage.getItem<string>(LLM_MODEL_KEY);
      const savedFixText = await LocalStorage.getItem<string>(FIX_TEXT_KEY);
      const savedShowExploreMore = await LocalStorage.getItem<string>(SHOW_EXPLORE_MORE_KEY);
      const savedExperimentalSingleCall = await LocalStorage.getItem<string>(EXPERIMENTAL_SINGLE_CALL_KEY);
      const savedSilenceTimeout = await LocalStorage.getItem<string>(SILENCE_TIMEOUT_KEY);
      const savedUsePersonalDictionary = await LocalStorage.getItem<string>(USE_PERSONAL_DICTIONARY_KEY);
      const savedUseCache = await LocalStorage.getItem<string>(USE_CACHE_KEY);
      const savedMuteDuringDictation = await LocalStorage.getItem<string>(MUTE_DURING_DICTATION_KEY);

      // Update download status for each model
      WHISPER_MODEL_OPTIONS.forEach((model) => {
        model.isDownloaded = isModelDownloaded(model.value);
      });

      if (savedTargetLang) setTargetLanguage(savedTargetLang);
      if (savedPrimaryLang) setPrimaryLanguage(savedPrimaryLang);
      if (savedSecondaryLang) setSecondaryLanguage(savedSecondaryLang);
      if (savedWhisperMode) setWhisperMode(savedWhisperMode);
      if (savedWhisperModel) setWhisperModel(savedWhisperModel);
      if (savedLlmModel) setLlmModel(savedLlmModel);
      if (savedFixText) setFixText(savedFixText === "true");
      if (savedShowExploreMore) setShowExploreMore(savedShowExploreMore === "true");
      if (savedExperimentalSingleCall) setExperimentalSingleCall(savedExperimentalSingleCall === "true");
      if (savedSilenceTimeout) setSilenceTimeout(savedSilenceTimeout);
      if (savedUsePersonalDictionary) setUsePersonalDictionary(savedUsePersonalDictionary === "true");
      if (savedUseCache !== null) setUseCache(savedUseCache === "true");
      if (savedMuteDuringDictation !== null) setMuteDuringDictation(savedMuteDuringDictation === "true");
    };

    loadSettings();
  }, []);

  const handleSubmit = async () => {
    // Save all preferences using local state
    await Promise.all([
      LocalStorage.setItem(DICTATE_TARGET_LANG_KEY, targetLanguage),
      LocalStorage.setItem(PRIMARY_LANG_KEY, primaryLanguage),
      LocalStorage.setItem(SECONDARY_LANG_KEY, secondaryLanguage),
      LocalStorage.setItem(WHISPER_MODE_KEY, whisperMode),
      LocalStorage.setItem(WHISPER_MODEL_KEY, whisperModel),
      LocalStorage.setItem(LLM_MODEL_KEY, llmModel),
      LocalStorage.setItem(FIX_TEXT_KEY, fixText.toString()),
      LocalStorage.setItem(SHOW_EXPLORE_MORE_KEY, showExploreMore.toString()),
      LocalStorage.setItem(EXPERIMENTAL_SINGLE_CALL_KEY, experimentalSingleCall.toString()),
      LocalStorage.setItem(SILENCE_TIMEOUT_KEY, silenceTimeout),
      LocalStorage.setItem(USE_PERSONAL_DICTIONARY_KEY, usePersonalDictionary.toString()),
      LocalStorage.setItem(USE_CACHE_KEY, useCache.toString()),
      LocalStorage.setItem(MUTE_DURING_DICTATION_KEY, muteDuringDictation.toString()),
    ]);

    await showHUD("Settings saved successfully");
    await popToRoot();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Settings" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Configure your AI Assistant preferences" />

      <Form.Separator />

      <Form.Description text="Language Settings" />

      <Form.Dropdown
        id="primaryLanguage"
        title="Primary Language"
        info="Your main language for translations and AI interactions"
        value={primaryLanguage}
        onChange={setPrimaryLanguage}
      >
        {LANGUAGE_OPTIONS.filter((lang) => lang.value !== "auto").map((lang) => (
          <Form.Dropdown.Item key={lang.value} value={lang.value} title={lang.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="secondaryLanguage"
        title="Secondary Language"
        info="Your alternate language for translations"
        value={secondaryLanguage}
        onChange={setSecondaryLanguage}
      >
        {LANGUAGE_OPTIONS.filter((lang) => lang.value !== "auto").map((lang) => (
          <Form.Dropdown.Item key={lang.value} value={lang.value} title={lang.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="targetLanguage"
        title="Default Output Language"
        info="Language used as output after speech recognition"
        value={targetLanguage}
        onChange={setTargetLanguage}
      >
        {LANGUAGE_OPTIONS.map((lang) => (
          <Form.Dropdown.Item key={lang.value} value={lang.value} title={lang.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description text="Speech Recognition Settings" />

      <Form.Dropdown
        id="whisperMode"
        title="Whisper Mode"
        info="Choose between online (OpenAI API) or local processing"
        value={whisperMode}
        onChange={setWhisperMode}
      >
        {WHISPER_MODE_OPTIONS.map((mode) => (
          <Form.Dropdown.Item key={mode.value} value={mode.value} title={mode.title} />
        ))}
      </Form.Dropdown>

      {whisperMode === "online" && (
        <Form.Checkbox
          id="experimentalSingleCall"
          label="Use experimental single API call mode"
          title="Experimental Mode"
          info="Send audio directly to GPT-4o-mini-audio-preview for faster processing (experimental)"
          value={experimentalSingleCall}
          onChange={setExperimentalSingleCall}
        />
      )}

      {whisperMode === "local" && (
        <>
          <Form.Dropdown
            id="whisperModel"
            title="Local Whisper Model"
            info="Select the local Whisper model to use (only applies when using local mode)"
            value={whisperModel}
            onChange={setWhisperModel}
          >
            {WHISPER_MODEL_OPTIONS.map((model) => (
              <Form.Dropdown.Item
                key={model.value}
                value={model.value}
                title={`${model.title} ${model.isDownloaded ? "✓" : "⚠️"}`}
              />
            ))}
          </Form.Dropdown>
          {!WHISPER_MODEL_OPTIONS.find((model) => model.value === whisperModel)?.isDownloaded ? (
            <Form.Description text="⚠️ Models need to be downloaded before use. Use the 'Manage Whisper Models' command to download and manage models." />
          ) : (
            <Form.Description text="Selected model is downloaded and ready to use." />
          )}
        </>
      )}

      <Form.Separator />

      <Form.Description text="AI Model Settings" />

      <Form.Dropdown
        id="llmModel"
        title="AI Model"
        info="Select the AI model to use for all operations"
        value={llmModel}
        onChange={setLlmModel}
      >
        {MODEL_OPTIONS.map((model) => (
          <Form.Dropdown.Item key={model.value} value={model.value} title={model.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description text="Recording Settings" />

      <Form.TextField
        id="silenceTimeout"
        title="Silence Timeout"
        placeholder="2.0"
        info="Number of seconds of silence before stopping recording (e.g. 2.0)"
        value={silenceTimeout}
        onChange={setSilenceTimeout}
      />

      <Form.Checkbox
        id="muteDuringDictation"
        label="Mute system audio during dictation"
        title="Mute During Dictation"
        info="Automatically mute system audio output while recording"
        value={muteDuringDictation}
        onChange={setMuteDuringDictation}
      />

      <Form.Separator />

      <Form.Description text="Feature Settings" />

      <Form.Checkbox
        id="fixText"
        label="The AI Assistant will fix grammar and spelling during translations and text generation"
        title="Improve Text Quality"
        info="Automatically fix grammar and spelling during translations and text generation"
        value={fixText}
        onChange={setFixText}
      />

      <Form.Checkbox
        id="showExploreMore"
        label="Show 'Explore More' in Summaries"
        title="Explore More"
        info="Include additional resources and related topics in page summaries"
        value={showExploreMore}
        onChange={setShowExploreMore}
      />

      <Form.Separator />

      <Form.Description text="Personal Dictionary Settings" />

      <Form.Checkbox
        id="usePersonalDictionary"
        label="Use personal dictionary for transcription"
        title="Personal Dictionary"
        info="Apply personal dictionary corrections during speech recognition"
        value={usePersonalDictionary}
        onChange={setUsePersonalDictionary}
      />

      <Form.Separator />

      <Form.Description text="Performance Settings" />

      <Form.Checkbox
        id="useCache"
        label="Use cache for AI operations"
        title="Cache Results"
        info="Cache AI results for 24 hours to improve performance (recommended)"
        value={useCache}
        onChange={setUseCache}
      />
    </Form>
  );
}
