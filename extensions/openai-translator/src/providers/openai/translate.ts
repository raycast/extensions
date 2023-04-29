/* eslint-disable camelcase */
import * as lang from "./lang";
import { fetchSSE } from "./utils";
import { SocksProxyAgent } from "socks-proxy-agent";
export type TranslateMode = "translate" | "polishing" | "summarize" | "what";

export interface TranslateQuery {
  text: string;
  detectFrom: string;
  detectTo: string;
  mode: TranslateMode;
  onMessage: (message: { content: string; role: string }) => void;
  onError: (error: string) => void;
  onFinish: (reason: string) => void;
  signal: AbortSignal;
  agent?: SocksProxyAgent;
}

export interface TranslateResult {
  original: string;
  text: string;
  from: string;
  to: string;
  error?: string;
}

const chineseLangs = ["zh", "zh-CN", "zh-TW", "zh-Hans", "zh-Hant", "wyw", "yue"];

const isAWord = (lang: string, text: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Segmenter = (Intl as any).Segmenter;
  if (!Segmenter) {
    return false;
  }
  const segmenter = new Segmenter(lang, { granularity: "word" });
  const iterator = segmenter.segment(text)[Symbol.iterator]();
  return iterator.next().value.segment === text;
};

export async function translate(query: TranslateQuery, entrypoint: string, apiKey: string, model: string) {
  const headers: Record<string, string> =
    apiKey == "none"
      ? { "Content-Type": "application/json" }
      : { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
  const fromChinese = chineseLangs.indexOf(query.detectFrom) > 0;
  const toChinese = chineseLangs.indexOf(query.detectTo) > 0;
  let systemPrompt = "You are a translation engine that can only translate text and cannot interpret it.";
  let assistantPrompt = `translate from ${lang.langMap.get(query.detectFrom) || query.detectFrom} to ${
    lang.langMap.get(query.detectTo) || query.detectTo
  }`;
  switch (query.mode) {
    case "translate":
      if (query.detectTo === "wyw" || query.detectTo === "yue") {
        assistantPrompt = `翻译成${lang.langMap.get(query.detectTo) || query.detectTo}`;
      }
      if (fromChinese) {
        if (query.detectTo === "zh-Hant") {
          assistantPrompt = "翻译成繁体白话文";
        } else if (query.detectTo === "zh-Hans") {
          assistantPrompt = "翻译成简体白话文";
        } else if (query.text.length < 5 && toChinese) {
          // 当用户的默认语言为中文时，查询中文词组（不超过5个字），展示多种翻译结果，并阐述适用语境。
          systemPrompt = `你是一个翻译引擎，请将给到的文本翻译成${
            lang.langMap.get(query.detectTo) || query.detectTo
          }。请列出3种（如果有）最常用翻译结果：单词或短语，并列出对应的适用语境（用中文阐述）、音标、词性、双语示例。按照下面格式用中文阐述：
                        <序号><单词或短语> · /<音标>
                        [<词性缩写>] <适用语境（用中文阐述）>
                        例句：<例句>(例句翻译)`;
          assistantPrompt = "";
        }
      }
      if (toChinese && isAWord(query.detectFrom, query.text.trim())) {
        // 翻译为中文时，增加单词模式，可以更详细的翻译结果，包括：音标、词性、含义、双语示例。
        systemPrompt = `你是一个翻译引擎，请将翻译给到的文本，只需要翻译不需要解释。当且仅当文本只有一个单词时，请给出单词原始形态（如果有）、单词的语种、对应的音标（如果有）、所有含义（含词性）、双语示例，至少三条例句，请严格按照下面格式给到翻译结果：
                <原始文本>
                [<语种>] · / <单词音标>
                [<词性缩写>] <中文含义>]
                例句：
                <序号><例句>(例句翻译)`;
      }
      break;
    case "what":
      systemPrompt = "You are a identifier, you can only response on markdown format.";
      if (fromChinese) {
        assistantPrompt = `请按照 markdown 的格式回答，Section有Maybe和Desc，Maybe回答他最可能是的东西（要求精确些），Desc回答这个东西的描述;
            答案应该使用中文。`;
      } else {
        assistantPrompt = `Please answer in markdown format with two section 'Maybe' and 'Desc'. 'Maybe' should provide the most likely thing it is (be more precise), while 'Desc' should describe what this thing is. And you answer must be ${
          lang.langMap.get(query.detectTo) || query.detectTo
        }.`;
      }
      break;
    case "polishing":
      systemPrompt = "You are a text embellisher, you can only embellish the text, don't interpret it.";
      if (fromChinese) {
        assistantPrompt = `使用 ${lang.langMap.get(query.detectFrom) || query.detectFrom} 语言润色此段文本`;
      } else {
        assistantPrompt = `polish this text in ${lang.langMap.get(query.detectFrom) || query.detectFrom}`;
      }
      break;
    case "summarize":
      systemPrompt = "You are a text summarizer, you can only summarize the text, don't interpret it.";
      if (toChinese) {
        assistantPrompt = "用最简洁的语言使用中文总结此段文本";
      } else {
        assistantPrompt = `summarize this text in the most concise language and muse use ${
          lang.langMap.get(query.detectTo) || query.detectTo
        } language!`;
      }
      break;
  }
  const body = {
    model,
    temperature: 0,
    max_tokens: 1000,
    top_p: 1,
    frequency_penalty: 1,
    presence_penalty: 1,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "assistant",
        content: assistantPrompt,
      },
      { role: "user", content: `"${query.text}"` },
    ],
    stream: true,
  };

  let isFirst = true;
  await fetchSSE(`${entrypoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: query.signal,
    agent: query.agent,
    onMessage: (msg) => {
      let resp;
      try {
        resp = JSON.parse(msg);
        // eslint-disable-next-line no-empty
      } catch {
        //query.onFinish("stop");
        return;
      }
      const { choices } = resp;
      if (!choices || choices.length === 0) {
        return { error: "No result" };
      }
      const { delta, finish_reason: finishReason } = choices[0];
      if (finishReason) {
        query.onFinish(finishReason);
        return;
      }
      const { content = "", role } = delta;
      let targetTxt = content;

      if (isFirst && targetTxt && ["“", '"', "「"].indexOf(targetTxt[0]) >= 0) {
        targetTxt = targetTxt.slice(1);
      }

      if (!role) {
        isFirst = false;
      }

      query.onMessage({ content: targetTxt, role });
    },
    onError: (err) => {
      const { error } = err;
      query.onError(error.message);
    },
  });
}
