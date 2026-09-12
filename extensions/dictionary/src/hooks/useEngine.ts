import { useCachedState, usePromise } from "@raycast/utils";
import { knownPos } from "../constants";
import { Image, showToast, Toast } from "@raycast/api";
import { createContext, useRef, useState } from "react";
import { useDebounce } from "../hooks";
import { DefListRts, DefItem, LanguageCode, isObjKey } from "../types";
import { EngineHookProps } from "../engines";
import { usePreferences } from "./usePreferences";

class EngineError extends Error {
  code: number;
  response: Response;
  constructor(response: Response) {
    super(`Request failed with status ${response.status}`);
    this.code = response.status;
    this.response = response;
  }
  getMessage = async (): Promise<string> => {
    try {
      const data = (await this.response.json()) as { error?: { message?: string }; message?: string };
      return data.error?.message || data.message || this.response.statusText;
    } catch {
      return this.response.statusText;
    }
  };
}

type ParserDef<T> = (item: T) => DefItem | DefItem[];
type ParserPos<T> = (item: T) => string;
type PromiseData<R> = { defs: DefListRts; extras?: DefListRts; rawRes: R; transCode: LanguageCode };
//Re-rendering flows: useDebounce -> !isLoading -> fetched data, !isLoading -> setTTS (if available)
const useEngine = <R extends object, T extends object>(query: string, engineProps: EngineHookProps<R, T>) => {
  const { getUrl, getOpts, parseData, parseDef, parsePos, parseExtras, parseTTS, key, fallbackSearch } = engineProps;
  const isValid = (query: string) => !query.startsWith("-") && !!query;
  const debouncedSearchTerm = useDebounce(query, 500, isValid);
  const abortable = useRef<AbortController | undefined>(undefined);
  const [defaultLang = "en"] = useCachedState<LanguageCode>("primary_language");
  const [fallbackLang] = useCachedState<LanguageCode>("fallback_language");
  // const [engineStatus, dispatch] = useReducer(engineStateReducer,{tts: [],})
  const [curTTS, setTTS] = useState<[string?, string?]>([]); // using simpler state currently instead of reducer
  const preferences = usePreferences();
  const prefApiKey = `${key}Key`;
  const apiKey = isObjKey(prefApiKey, preferences) ? preferences[prefApiKey] : undefined;
  const parseIcon = (posAbbr: string | undefined, index: number): Image.ImageLike => {
    if (posAbbr) return `${posAbbr}.png`;
    return `idx${index}.png`;
  };
  const parseDefListItem = (defs: T[], parserDef: ParserDef<T>, parserPos?: ParserPos<T>): DefListRts => {
    return defs.slice(0, 6).map((defItem, index) => {
      const pos = (parserPos && parserPos(defItem)) || "";
      const posAbbr = Object.keys(knownPos).find((abbr) => pos.startsWith(abbr));
      const defs = parserDef(defItem);
      if (Array.isArray(defs)) {
        return {
          title: pos || "other",
          defItems: defs.slice(0, 6).map((def, idx) => ({ icon: parseIcon(undefined, idx + 1), ...def })),
        };
      } else
        return {
          icon: parseIcon(posAbbr, index + 1),
          ...defs,
        };
    });
  };
  const onSuccess = async (data: PromiseData<R>) => {
    if (parseTTS) {
      const { transCode, rawRes } = data;
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading tts",
      });
      try {
        const ttsList = await parseTTS(debouncedSearchTerm, transCode, rawRes);
        // dispatch({type: 'tts_update', payload: ttsList})
        setTTS(ttsList);
        toast.style = Toast.Style.Success;
        toast.title = "TTS is ready";
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to load TTS";
        if (err instanceof Error) {
          toast.message = err.message;
        }
      }
    } else {
      setTTS([]);
    }
  };
  const onError = async (error: Error & { code?: string }) => {
    const toast = await showToast({
      style: Toast.Style.Failure,
      title: engineProps.title,
    });
    let title = engineProps.title;
    let message = "Unknown Error";
    if (error.code === "ENOTFOUND" || error.code === "BAD_NETWORK") {
      toast.title = `You're offline.`;
      toast.message = "check your network.";
    } else if (error instanceof EngineError) {
      switch (error.code) {
        case 400: {
          message = await error.getMessage();
          break;
        }
        case 503:
        case 429:
          title = `Reached max limits on ${engineProps.title}`;
          message = "the reset may take up to 24 hours.";
          break;
        case 401:
        case 403:
          title = `Failed to authenticate on ${engineProps.title}`;
          message = "api key is invalid or unset.";
          break;
        default:
          message = `Uncaught error ${error.code}`;
      }
      toast.title = title;
      toast.message = message;
    } else {
      toast.message = error.message;
    }
  };
  // const { isLoading, data, revalidate } =  useFetch<R>(url, { ...options, execute: !!debouncedSearchTerm}) // not fit when we using more fetch within one chain
  const { isLoading, data } = usePromise(
    async (searchTerm: string, engineCacheKey: string) => {
      void engineCacheKey;
      const url = getUrl(searchTerm);
      let options = getOpts && getOpts(searchTerm, defaultLang, apiKey);
      const request = async (requestOptions?: RequestInit): Promise<R> => {
        const response = await fetch(url, { ...requestOptions, signal: abortable.current?.signal });
        if (!response.ok) throw new EngineError(response);
        return (await response.json()) as R;
      };
      let jsonD = await request(options);
      let parsedData = parseData(jsonD);
      let transCode = defaultLang;
      if (!!fallbackSearch && parsedData.src && parsedData.src === defaultLang && fallbackLang) {
        //auto switch to fallback language
        options = getOpts && getOpts(searchTerm, fallbackLang, apiKey);
        jsonD = await request(options);
        parsedData = parseData(jsonD);
        transCode = fallbackLang;
      }
      const extras = parseExtras && parseExtras(jsonD, transCode);
      const defs = parseDefListItem(parsedData.definitions, parseDef, parsePos);
      return { defs, extras, transCode, rawRes: jsonD, src: parsedData.src }; // TODO: to be more precise/explicit
    },
    [debouncedSearchTerm, [key, defaultLang, fallbackLang].join("-")],
    {
      abortable,
      execute: !!debouncedSearchTerm,
      onData: onSuccess,
      onError,
    },
  );
  return { isLoading, data, curTTS };
};

export const SearchContext = createContext<{ curTTS: [string?, string?]; isShowingDetail: boolean }>({
  curTTS: [],
  isShowingDetail: false,
});
export default useEngine;
