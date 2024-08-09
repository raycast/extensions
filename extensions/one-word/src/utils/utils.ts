import { Cache, Clipboard, LaunchType, LocalStorage, Toast, launchCommand, open, showToast } from "@raycast/api";
import { API } from "../api";
import { COMMANDS, IS_DEBUG, STORE, STR, SUPPORTED_LANGUAGES, URL } from "../constants";
import { AppCachedConfig, AppConfig, CombinedConfig, initialCachedConfig, initialConfig } from "../hooks/use-config";
import { Interval, LanguageCode, SupportedLanguage } from "../types";

const cache = new Cache();

//Check if the language is supported by Random Word API
export const checkIsLangSupported = (language?: LanguageCode) => {
  return SUPPORTED_LANGUAGES?.includes(language as SupportedLanguage);
};

export interface DynamicWordTranslationParams {
  from: LanguageCode;
  to: LanguageCode;
  customWord?: string;
}
interface WordTranslationParams extends DynamicWordTranslationParams {
  unsupported?: boolean;
}

const getWordTranslation = async (params: WordTranslationParams): Promise<WordEntry> => {
  const { from, to, customWord, unsupported } = params;

  const timestamp = Date.now();

  if (customWord) {
    const translation = await API.fetchTranslation(customWord, from, to);
    return { word: customWord, translation, wordLanguageCode: from, translationLanguageCode: to, timestamp };
  }

  if (unsupported) {
    const randomWord = await API.fetchRandomWord(); //English
    const word = await API.fetchTranslation(randomWord, "en", from);
    const translation = await API.fetchTranslation(word, from, to);
    return { word, translation, wordLanguageCode: from, translationLanguageCode: to, timestamp };
  }

  const word = await API.fetchRandomWord(from);
  const translation = await API.fetchTranslation(word, from, to);
  return { word, translation, wordLanguageCode: from, translationLanguageCode: to, timestamp };
};

export const getDynamicRandomWordTranslation = async (params: Partial<DynamicWordTranslationParams>) => {
  const { from, to, customWord } = params;
  if (!from || !to) return;

  const isFirstLanguageSupported = checkIsLangSupported(from);
  const isSecondLanguageSupported = checkIsLangSupported(to);

  if (isFirstLanguageSupported) {
    return getWordTranslation({ from, to, customWord });
  }
  if (isSecondLanguageSupported) {
    return getWordTranslation({ from: to, to: from, customWord });
  }
  return getWordTranslation({ from, to, customWord, unsupported: true });
};

export const print = (wordEntry?: WordEntry) => {
  if (!wordEntry) return "";

  const { word, translation } = wordEntry;

  const { delimiter, swapWordsInMenuBar } = safeGetCache(STORE.CONFIG, initialCachedConfig) as AppCachedConfig;

  if (swapWordsInMenuBar) {
    return `${translation} ${delimiter} ${word}`;
  }
  return `${word} ${delimiter} ${translation}`;
};

export const updateWordEntry = async (params: DynamicWordTranslationParams) => {
  const wordEntry = await getDynamicRandomWordTranslation(params);
  if (wordEntry) {
    await LocalStorage.setItem(STORE.WORD_ENTRY, JSON.stringify(wordEntry));
    await execute("menu-bar", LaunchType.Background);
  }
  return wordEntry;
};

const getLearningWordEntry = async (wordEntry?: WordEntry) => {
  if (!wordEntry) {
    await fireToast("Failure", STR.FAILED_LOADING_NEW_WORD);
    return { word: null, language: null };
  }

  const { learningLanguage } = await getConfig();
  const { word, translation, wordLanguageCode, translationLanguageCode } = wordEntry;

  let learningWord = null;
  if (wordLanguageCode === learningLanguage) {
    learningWord = word;
  } else if (translationLanguageCode === learningLanguage) {
    learningWord = translation;
  }

  if (!learningWord) {
    await fireToast("Failure", STR.NO_LEARNING_LANGUAGE);
    await execute("config");
    return { word: null, language: null };
  }

  return { word: learningWord, language: learningLanguage };
};

export const openPronunciation = async (wordEntry?: WordEntry) => {
  const { word, language } = await getLearningWordEntry(wordEntry);
  if (!word || !language) return;

  await open(`${URL.PRONUNCIATION}/${word}/${language}`);
};

export const copy = async (entry?: WordEntry | WordEntry[]) => {
  let copyString = "";

  if (Array.isArray(entry)) {
    copyString = JSON.stringify(entry.map(({ word, translation }) => ({ word, translation })));
  } else {
    const { word } = await getLearningWordEntry(entry);
    if (!word) return;
    copyString = word;
  }

  try {
    await Clipboard.copy(copyString);
    await fireToast("Success", STR.COPIED);
  } catch (error) {
    await fireToast("Failure", STR.NOT_COPIED, error);
  }
};

export const getConfig = async () => {
  const configJson = await LocalStorage.getItem<string>(STORE.CONFIG);
  const cachedConfig = safeGetCache(STORE.CONFIG) as AppCachedConfig;

  if (!configJson || !cachedConfig) return initialConfig;
  const appConfig = JSON.parse(configJson) as AppConfig;

  return { ...appConfig, ...cachedConfig } as CombinedConfig;
};

export const getNextExecutionTime = (intervalValue: Interval | undefined, lastExecution: number | string) => {
  const lastExecutionTimestamp = Number(lastExecution);

  if (!intervalValue || !lastExecution || intervalValue === "Off") {
    return null;
  } else if (intervalValue.includes("DEBUG")) {
    return lastExecutionTimestamp + 1 * 60 * 1000;
  } else if (intervalValue === "30 Minutes") {
    return lastExecutionTimestamp + 30 * 60 * 1000;
  } else if (intervalValue === "Hour") {
    return lastExecutionTimestamp + 60 * 60 * 1000;
  } else if (intervalValue === "2 Hours") {
    return lastExecutionTimestamp + 2 * 60 * 60 * 1000;
  } else if (intervalValue === "3 Hours") {
    return lastExecutionTimestamp + 3 * 60 * 60 * 1000;
  } else if (intervalValue === "6 Hours") {
    return lastExecutionTimestamp + 6 * 60 * 60 * 1000;
  } else if (intervalValue === "12 Hours") {
    return lastExecutionTimestamp + 12 * 60 * 60 * 1000;
  } else if (intervalValue === "Day") {
    return lastExecutionTimestamp + 24 * 60 * 60 * 1000;
  } else if (intervalValue === "2 Days") {
    return lastExecutionTimestamp + 2 * 24 * 60 * 60 * 1000;
  } else {
    return lastExecutionTimestamp + 3 * 24 * 60 * 60 * 1000;
  }
};

export const toHHMMSS = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toTimeString().split(" ")[0];
};

export const debugLog = (message: string) => IS_DEBUG && console.log(message);

export const execute = async (command: keyof typeof COMMANDS, launchType: LaunchType = LaunchType.UserInitiated) => {
  await launchCommand({ name: COMMANDS[command], type: launchType });
};

export const safeGetCache = <T extends object, K = T>(store: STORE, defaultValue?: K) => {
  const value = cache.get(store);
  return value ? (JSON.parse(value) as T) : defaultValue;
};

export const safeGetLocalStorage = async <T extends object, K = T>(store: STORE, defaultValue?: K) => {
  const value = (await LocalStorage.getItem(store)) as string;
  return value ? (JSON.parse(value) as T) : (defaultValue as K);
};

export const fireToast = async (style: keyof typeof Toast.Style, title: string, error?: unknown) => {
  let message = "";

  if (error) {
    console.error(error);
    if (typeof error === "string") {
      message += error;
    } else if (error instanceof Error) {
      message += error.message;
    }
  }

  await showToast({
    style: Toast.Style[style],
    title,
    message,
  });
};
