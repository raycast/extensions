import { useState, useRef, useCallback } from "react";
import {
  Icon,
  Color,
  LaunchProps,
  List,
  Action,
  ActionPanel,
  getPreferenceValues,
  Toast,
  showToast,
  getSelectedText,
} from "@raycast/api";
import { runAppleScript } from "run-applescript";
import fetch, { Response, AbortError } from "node-fetch";
import crypto, { randomUUID } from "crypto";
import fs from "fs";
import sound from "sound-play";
import { URLSearchParams } from "url";

export default function Command(props: LaunchProps<{ arguments: Arguments.Index }>) {
  const { text } = props.arguments;
  const { searchText, state, setState, setSearchTextAndTranslate } = useSearchText(text);

  return (
    <List
      searchText={searchText}
      isLoading={state.isLoading}
      onSearchTextChange={setSearchTextAndTranslate}
      searchBarPlaceholder={
        state.selection || state.clipboard
          ? `default search from ${state.clipboard ? "Clipboard" : state.selection ? "Selection" : ""}${
              state.searchText != "" ? " : " + state.searchText : ""
            }`
          : "input content wants to tranlate..."
      }
      throttle
    >
      {state.translateResult ? (
        <Translate translate_result={state.translateResult} state={state} setState={setState} />
      ) : null}
    </List>
  );
}

function Translate({
  translate_result,
  state,
  setState,
}: {
  translate_result: TranslateResult;
  state: TranslateState;
  setState: React.Dispatch<React.SetStateAction<TranslateState>>;
}) {
  if (translate_result && translate_result.errorCode && translate_result.errorCode !== "0") {
    const errorMessage = `
    * error code: ${translate_result.errorCode}.
    * you can find all error code in here. (https://ai.youdao.com/DOCSIRMA/html/自然语言翻译/API文档/文本翻译服务/文本翻译服务-API文档.html)`;
    showToast({
      style: Toast.Style.Failure,
      title: "Translation Error",
      message: errorMessage,
    });
  }
  return (
    <>
      {translate_result.translation ? (
        <List.Section title={`Translate`}>
          {translate_result.translation.map((item: string, index: number) => (
            <List.Item
              key={index}
              title={item}
              subtitle={
                translate_result.basic?.phonetic ? `${state.searchText} /${translate_result.basic?.phonetic}/` : ""
              }
              icon={{ source: Icon.Dot, tintColor: Color.Red }}
              actions={
                <TranslateResultActionPanel
                  setState={setState}
                  text={state.searchText}
                  copy_content={item}
                  language={translate_result.l}
                  url={
                    translate_result.webdict && translate_result.webdict.url ? translate_result.webdict.url : undefined
                  }
                  speak_url={translate_result.speakUrl}
                  tspeak_url={translate_result.tSpeakUrl}
                />
              }
            />
          ))}
        </List.Section>
      ) : null}
      {translate_result.basic && translate_result.basic.explains && translate_result.basic.explains.length > 0 ? (
        <List.Section title="Detail">
          {translate_result.basic.explains.map((item: string, index: number) => (
            <List.Item
              key={index}
              title={item}
              icon={{ source: Icon.Dot, tintColor: Color.Blue }}
              actions={
                <TranslateResultActionPanel
                  copy_content={item}
                  language={translate_result.l}
                  url={
                    translate_result.webdict && translate_result.webdict.url ? translate_result.webdict.url : undefined
                  }
                />
              }
            />
          ))}
        </List.Section>
      ) : null}
      {translate_result.web && translate_result.web.length > 0 ? (
        <List.Section title="Web Translate">
          {translate_result.web.map((item: TranslateWebResult, index: number) => (
            <List.Item
              key={index}
              title={item.value.join(", ")}
              icon={{ source: Icon.Dot, tintColor: Color.Yellow }}
              subtitle={item.key}
              actions={
                <TranslateResultActionPanel
                  copy_content={item.value.join(", ")}
                  language={translate_result.l}
                  url={
                    translate_result.webdict && translate_result.webdict.url ? translate_result.webdict.url : undefined
                  }
                />
              }
            />
          ))}
        </List.Section>
      ) : null}
    </>
  );
}

function TranslateResultActionPanel(props: {
  text?: string;
  copy_content: string;
  language: string;
  url: string | undefined;
  speak_url?: string;
  tspeak_url?: string;
  setState?: React.Dispatch<React.SetStateAction<TranslateState>>;
}) {
  const { text, copy_content, language, url, speak_url, tspeak_url, setState } = props;

  //if need to use modern translation page
  const { is_using_modern_web } = getPreferenceValues();
  let webURL = url;
  if (is_using_modern_web) {
    const lang = language.split("2")[0];
    webURL = text && lang ? `https://www.youdao.com/result?word=${encodeURIComponent(text)}&lang=${lang}` : url;
  }

  return (
    <ActionPanel>
      <Action.CopyToClipboard content={copy_content} />
      {webURL ? <Action.OpenInBrowser url={webURL} /> : null}
      <Action
        icon={Icon.Message}
        onAction={() => {
          if (speak_url && setState) {
            setState((oldState) => ({
              ...oldState,
              isLoading: true,
            }));
            //try speak url first, and if it does not return 200, turn to use defaut service
            try {
              pronunceIt(speak_url, text);
            } catch (error) {
              console.log(error);
            } finally {
              setState((oldState) => ({
                ...oldState,
                isLoading: false,
              }));
            }
          }
        }}
        shortcut={{ modifiers: ["ctrl"], key: "return" }}
        title={"Read Original"}
      />
      {speak_url ? (
        <Action
          icon={Icon.Message}
          onAction={() => {
            if (speak_url && setState) {
              setState((oldState) => ({
                ...oldState,
                isLoading: true,
              }));
              //try speak url first, and if it does not return 200, turn to use defaut service
              try {
                pronunceIt(tspeak_url, copy_content);
              } catch (error) {
                console.log(error);
              } finally {
                setState((oldState) => ({
                  ...oldState,
                  isLoading: false,
                }));
              }
            }
          }}
          shortcut={{ modifiers: ["shift"], key: "return" }}
          title={"Read Translated"}
        />
      ) : null}
    </ActionPanel>
  );
}

function useSearchText(argText: string) {
  const [searchText, setSearchText] = useState(argText);
  const { state, translate, setState } = useTranslate(argText);

  const setSearchTextAndTranslate = function setSearchTextAndTranslate(translateText: string) {
    console.log(`set search text to |${translateText}|`);
    setSearchText(translateText);
    translate(translateText);
  };

  return {
    searchText: searchText,
    state: state,
    setState: setState,
    setSearchTextAndTranslate: setSearchTextAndTranslate,
  };
}

function useTranslate(argText: string) {
  const [state, setState] = useState<TranslateState>({
    searchText: argText,
    translateResult: undefined,
    selection: false,
    clipboard: false,
    isLoading: true,
  });
  const cancelRef = useRef<AbortController | null>(null);

  const translate = useCallback(
    async function translate(content: string) {
      const { is_search_clipboard } = getPreferenceValues();
      let isSelection = false;
      let isClipboard = false;

      try {
        content = content || (await getSelectedText()).trim();
        isSelection = !!content;
      } catch (error) {
        console.log("get selected text error...");
      }

      try {
        if (!content && is_search_clipboard) {
          content = await runAppleScript("the clipboard");
          isClipboard = !!content;
        }
      } catch (error) {
        console.log("get clipboard text error...");
      }

      if (content && content.length < 50) {
        content = content.trim();
      } else {
        content = "";
        isSelection = false;
        isClipboard = false;
      }

      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
        selection: isSelection,
        clipboard: isClipboard,
        searchText: content,
      }));
      try {
        const result = await performTranslate(content, cancelRef.current.signal);
        setState((oldState) => ({
          ...oldState,
          translateResult: result,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        if (error instanceof AbortError) {
          return;
        }

        console.error("search error", error);
        showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
      }
    },
    [cancelRef, setState]
  );

  return {
    state: state,
    translate: translate,
    setState: setState,
  };
}

async function performTranslate(searchText: string, signal: AbortSignal): Promise<TranslateResult | undefined> {
  console.log(`start to search |${searchText}|`);
  if (searchText.trim()) {
    return translateAPI(searchText, signal).then(async (response) => {
      return (await response.json()) as TranslateResult;
    });
  } else {
    return undefined;
  }
}

function generateSign(content: string, salt: string, curtime: number, app_key: string, app_secret: string) {
  const sha256 = crypto.createHash("sha256");
  sha256.update(app_key + getContentForSign(content) + salt + curtime + app_secret);
  const cipher = sha256.digest("hex");
  return cipher;
}

function getContentForSign(content: string) {
  return content.length > 20
    ? content.substring(0, 10) + content.length + content.substring(content.length - 10)
    : content;
}

function translateAPI(content: string, signal: AbortSignal): Promise<Response> {
  const { app_key, app_secret, from_language, to_language } = getPreferenceValues();
  const q = content;
  const salt = randomUUID();
  const curtime = Math.floor(Date.now() / 1000);
  content;
  const sign = generateSign(q, salt, curtime, app_key, app_secret);
  const query = new URLSearchParams([
    ["q", q],
    ["from", from_language],
    ["to", to_language],
    ["appKey", app_key],
    ["salt", salt],
    ["sign", sign],
    ["signType", "v3"],
    ["curtime", curtime],
  ]);
  console.log(`${query}`);
  return fetch(`https://openapi.youdao.com/api`, {
    signal: signal,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: query.toString(),
  });
}

function pronunceIt(speak_url: string | undefined, speak_text: string | undefined): void {
  if (speak_url == undefined || speak_url.length === 0) {
    return;
  }
  fetch(speak_url)
    .then((res) => {
      if (res.status !== 200 && res.headers.get("Content-Type") === "audio/mp3" && speak_text != undefined) {
        return fetch(`http://dict.youdao.com/dictvoice?audio=${speak_text}`);
      } else {
        return res;
      }
    })
    .then((res) => {
      const fileStream = fs.createWriteStream("/tmp/tmp_raycast_simpleyd.mp3");
      res?.body?.pipe(fileStream);
      sound.play("/tmp/tmp_raycast_simpleyd.mp3");
    });
}

interface TranslateState {
  translateResult?: TranslateResult;
  searchText?: string;
  clipboard?: boolean;
  selection?: boolean;
  isLoading: boolean;
}

interface TranslateResult {
  translation?: Array<string>;
  isWord: boolean;
  basic?: { phonetic?: string; explains?: Array<string> };
  l: string;
  web?: Array<TranslateWebResult>;
  webdict?: { url: string };
  speakUrl?: string;
  tSpeakUrl?: string;
  errorCode: string;
}

interface TranslateWebResult {
  value: Array<string>;
  key: string;
}
