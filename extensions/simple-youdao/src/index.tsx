import { useCallback, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  LaunchProps,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import fetch, { AbortError, Response } from "node-fetch";
import crypto, { randomUUID } from "crypto";
import fs from "fs";
import sound from "sound-play";
import { URLSearchParams } from "url";
import { exec } from "child_process";

export default function Command(props: LaunchProps<{ arguments: Arguments.Index }>) {
  const { text } = props.arguments;
  const { searchText, state, setState, setSearchTextAndTranslate } = useSearchText(text);

  return (
    <List
      searchText={searchText}
      isLoading={state.isLoading}
      onSearchTextChange={setSearchTextAndTranslate}
      searchBarPlaceholder="Enter text to translate"
    >
      {state.translateResult ? (
        <Translate translate_result={state.translateResult} state={state} setState={setState} />
      ) : null}
    </List>
  );
}

function parseError(code: number): string {
  interface Message {
    [key: number]: string;
  }

  const messages: Message = {
    101: "缺少必填的参数",
    102: "不支持的语言类型",
    103: "翻译文本过长",
    108: "应用ID无效",
    110: "无相关服务的有效实例",
    111: "开发者账号无效",
    112: "请求服务无效",
    113: "查询为空",
    202: "签名检验失败,检查 KEY 和 SECRET",
    401: "账户已经欠费",
    411: "访问频率受限",
  };
  return messages[code] || "请参考错误码：" + code;
}

function isChinese(text: string | undefined): boolean {
  if (!text) {
    return false;
  }
  return /^[\u4e00-\u9fa5]+$/.test(text);
}

function parsePhonetic(basic: any, text: string | undefined): string {
  if (!text) {
    return "";
  }
  let phonetic = "";

  if (isChinese(text) && basic.phonetic) {
    phonetic = "[" + basic.phonetic + "] ";
  }

  if (basic["us-phonetic"]) {
    phonetic += " [美: " + basic["us-phonetic"] + "] ";
  }

  if (basic["uk-phonetic"]) {
    phonetic += " [英: " + basic["uk-phonetic"] + "]";
  }

  return phonetic;
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
    showToast({
      style: Toast.Style.Failure,
      title: "翻译出错啦",
      message: parseError(Number(translate_result.errorCode)),
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
                translate_result.basic?.phonetic
                  ? `${state.searchText} ${parsePhonetic(translate_result.basic, state.searchText)}`
                  : ""
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
                  pronounce={isChinese(state.searchText) ? item : state.searchText}
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
                  setState={setState}
                  text={state.searchText}
                  copy_content={item}
                  language={translate_result.l}
                  url={
                    translate_result.webdict && translate_result.webdict.url ? translate_result.webdict.url : undefined
                  }
                  pronounce={isChinese(state.searchText) ? item : state.searchText}
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
                  setState={setState}
                  text={state.searchText}
                  copy_content={item.value.join(", ")}
                  language={translate_result.l}
                  url={
                    translate_result.webdict && translate_result.webdict.url ? translate_result.webdict.url : undefined
                  }
                  pronounce={isChinese(state.searchText) ? item.value[0] : item.key}
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
  setState?: React.Dispatch<React.SetStateAction<TranslateState>>;
  pronounce?: string;
}) {
  const { text, copy_content, language, url, setState, pronounce } = props;

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
      <Action
        icon={Icon.Message}
        onAction={() => {
          if (setState) {
            setState((oldState) => ({
              ...oldState,
              isLoading: true,
            }));
            try {
              pronounceIt(pronounce);
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
        shortcut={{ modifiers: ["cmd"], key: "return" }}
        title={"Read"}
      />
      {webURL ? <Action.OpenInBrowser shortcut={{ modifiers: ["ctrl"], key: "return" }} url={webURL} /> : null}
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
    isLoading: true,
  });
  const cancelRef = useRef<AbortController | null>(null);

  const translate = useCallback(
    async function translate(content: string) {
      const { max_input_length } = getPreferenceValues();
      const maxContentLength = /^[1-9]\d*$/.test(max_input_length) ? Number(max_input_length) : 500;
      if (content && content.length < maxContentLength) {
        content = content.trim();
      } else {
        content = "";
      }

      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
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
  return sha256.digest("hex");
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

function sayIt(speak_text: string) {
  return new Promise<boolean>((resolve) => {
    exec(`say ${speak_text} -v Samantha`, (error) => {
      if (error) {
        console.log("failed to say it", error);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

function pronounceIt(speak_text: string | undefined): void {
  if (speak_text == undefined || speak_text.length === 0) {
    return;
  }

  sayIt(speak_text).then((success) => {
    if (!success) {
      fetch(`http://dict.youdao.com/dictvoice?type=0&audio=${speak_text}`).then((res) => {
        const fileStream = fs.createWriteStream("/tmp/tmp_raycast_simpleyd.mp3");
        res?.body?.pipe(fileStream);
        sound.play("/tmp/tmp_raycast_simpleyd.mp3");
      });
    }
  });
}

interface TranslateState {
  translateResult?: TranslateResult;
  searchText?: string;
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
