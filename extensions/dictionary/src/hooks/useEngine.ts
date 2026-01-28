import { useCachedState, usePromise } from "@raycast/utils";
import { knownPos } from "../constants";
import { Image, showToast, Toast } from "@raycast/api";
import { createContext, useRef, useState } from "react";
import { useDebounce } from "../hooks";
import { DefListRts, DefItem, LanguageCode, isObjKey } from "../types";
import fetch from "cross-fetch";
import { EngineHookProps } from "../engines";
import { usePreferences } from "./usePreferences";

class EngineError extends Error {
  code: number;
  response: Response;
  constructor(response: Response) {
    super(); // (1)
    this.code = response.status; // (2)
    this.response = response;
  }
  get_message = async (): Promise<object> => {
    return await this.response.json();
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
  const abortable = useRef<AbortController>();
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
          const error_data = (await error.get_message()) as { error: { message: string } };
          message = error_data?.error?.message;
          break;
        }
        case 503:
        case 429:
          title = `Reached max limits on ${engineProps.title}`;
          message = "the reset may take up to 24 hours.";
          break;
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
    async (searchTerm: string, _key) => {
      const url = getUrl(searchTerm);
      let options = getOpts && getOpts(searchTerm, defaultLang, apiKey);
      let response = await fetch(url, { ...options, signal: abortable.current?.signal });
      if (!response.ok && ![404].includes(response.status)) throw new EngineError(response);
      let jsonD = await response.json();
      let parsedData = parseData(jsonD as R);
      let transCode = defaultLang;
      if (!!fallbackSearch && parsedData.src && parsedData.src === defaultLang && fallbackLang) {
        //auto switch to fallback language
        options = getOpts && getOpts(searchTerm, fallbackLang, apiKey);
        response = await fetch(url, { ...options, signal: abortable.current?.signal });
        jsonD = await response.json();
        parsedData = parseData(jsonD as R);
        transCode = fallbackLang;
      }
      const extras = parseExtras && parseExtras(jsonD as R, transCode);
      const defs = parseDefListItem(parsedData.definitions, parseDef, parsePos);
      return { defs, extras, transCode, rawRes: jsonD as R, src: parsedData.src }; // TODO: to be more precise/explicit
    },
    [debouncedSearchTerm, [key, defaultLang, fallbackLang].join("-")],
    {
      abortable,
      execute: !!debouncedSearchTerm,
      onData: onSuccess,
      onError,
    }
  );
  return { isLoading, data, curTTS };
};

export const SearchContext = createContext<{ curTTS: [string?, string?]; isShowingDetail: boolean }>({
  curTTS: [],
  isShowingDetail: false,
});
export default useEngine;
