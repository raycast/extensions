/*
 * @author: tisfeng
 * @createTime: 2023-03-14 22:11
 * @lastEditor: tisfeng
 * @lastEditTime: 2023-04-25 23:05
 * @fileName: chat.ts
 *
 * Copyright (c) 2023 by ${git_name}, All Rights Reserved.
 */

import axios, { AxiosError } from "axios";
import { getProxyAgent } from "../../axiosConfig";
import { QueryWordInfo } from "../../dictionary/youdao/types";
import { AppKeyStore } from "../../preferences";
import { QueryTypeResult, TranslationType } from "../../types";
import { getTypeErrorInfo } from "../../utils";
import { networkTimeout } from "./../../consts";
import { fetchSSE } from "./utils";

const controller = new AbortController();
const timeout = setTimeout(() => {
  controller.abort();
}, networkTimeout); // set timeout to 15s.

export async function requestOpenAIStreamTranslate(queryWordInfo: QueryWordInfo): Promise<QueryTypeResult> {
  console.warn(`---> start request OpenAI`);

  const url = AppKeyStore.openAIAPIURL;

  const prompt = `translate the following ${queryWordInfo.fromLanguage} text to ${queryWordInfo.toLanguage}, :\n\n${queryWordInfo.word} `;
  console.warn(`---> prompt: ${prompt}`);
  const message = [
    {
      role: "system",
      content:
        "You are a faithful translation assistant that can only translate text and cannot interpret it, you can only return the translated text, do not show additional descriptions and annotations.",
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  const params = {
    model: "gpt-3.5-turbo",
    messages: message,
    temperature: 0,
    max_tokens: 2000,
    top_p: 1.0,
    frequency_penalty: 1,
    presence_penalty: 1,
    stream: true,
  };

  const openAIAPIKey = AppKeyStore.openAIAPIKey;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${openAIAPIKey}`,
  };

  const type = TranslationType.OpenAI;

  let isFirst = true;

  let resultText = "";
  let targetTxt = "";
  let openAIResult: QueryTypeResult;

  const httpsAgent = await getProxyAgent();
  console.warn(`---> openai agent: ${JSON.stringify(httpsAgent)}`);

  return new Promise((resolve, reject) => {
    fetchSSE(`${url}`, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
      agent: httpsAgent,
      signal: controller.signal,
      onMessage: (msg) => {
        // console.warn(`---> openai msg: ${JSON.stringify(msg)}`);
        clearTimeout(timeout);

        let resp;
        try {
          resp = JSON.parse(msg);
          // console.warn(`---> openai response: ${JSON.stringify(resp)}`);
        } catch {
          if (queryWordInfo.onFinish) {
            queryWordInfo.onFinish("stop");
          }
          return;
        }
        const { choices } = resp;
        if (!choices || choices.length === 0) {
          return { error: "No result" };
        }
        const { delta, finish_reason: finishReason } = choices[0];
        if (finishReason) {
          return;
        }
        const { content = "", role } = delta;
        targetTxt = content;

        const leftQuotes = ['"', "“", "'", "「"];
        const firstQueryTextChar = queryWordInfo.word[0];
        const firstTranslatedTextChar = targetTxt[0];
        if (
          isFirst &&
          !leftQuotes.includes(firstQueryTextChar) &&
          targetTxt &&
          leftQuotes.includes(firstTranslatedTextChar)
        ) {
          targetTxt = targetTxt.slice(1);
        }

        // console.warn(`---> openai targetTxt: ${targetTxt}`);
        resultText += targetTxt;

        if (!role) {
          isFirst = false;
        }

        openAIResult = {
          type,
          queryWordInfo,
          translations: [resultText],
          result: {
            translatedText: resultText,
          },
        };
        // query.onMessage({ content: targetTxt, role });
        if (queryWordInfo.onMessage) {
          queryWordInfo.onMessage({ content: targetTxt, role });
        }

        resolve(openAIResult);
      },
      onError: (err) => {
        if (err.message === "canceled") {
          console.log(`---> OpenAI canceled`);
          return reject(undefined);
        }

        console.error(`---> OpenAI error: ${JSON.stringify(err)}`);

        let errorMessage = err.error?.message ?? "Unknown error";
        console.warn(`---> OpenAI error: ${errorMessage}`);

        if (err.name === "AbortError") {
          errorMessage = `Request timeout.`;
        }

        const errorInfo = {
          type: type,
          code: `401`,
          message: errorMessage,
        };
        reject(errorInfo);
      },
    });
  });
}

// Use axios to request openai api.
export function requestOpenAITextTranslate(queryWordInfo: QueryWordInfo): Promise<QueryTypeResult> {
  //   console.warn(`---> start request OpenAI`);

  const url = AppKeyStore.openAIAPIURL;
  //   const prompt = `translate from English to Chinese:\n\n"No level of alcohol consumption is safe for our health." =>`;
  const prompt = `translate from ${queryWordInfo.fromLanguage} to ${queryWordInfo.toLanguage}:\n\n"${queryWordInfo.word}" =>`;
  const message = [
    {
      role: "system",
      content: "You are a faithful translation assistant that can only translate text and cannot interpret it.",
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  const params = {
    model: "gpt-3.5-turbo",
    messages: message,
    temperature: 0,
    max_tokens: 2000,
    top_p: 1.0,
    frequency_penalty: 1,
    presence_penalty: 1,
  };

  const openAIAPIKey = AppKeyStore.openAIAPIKey;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${openAIAPIKey}`,
  };

  const type = TranslationType.OpenAI;

  return new Promise((resolve, reject) => {
    // Post request is too slow, we need to use server-send-event to improve performance.
    axios
      .post(url, params, {
        headers,
      })
      .then((response) => {
        const { data } = response;
        // console.warn(`---> openai response: ${JSON.stringify(data)}`);

        const { choices } = data;
        if (choices.length === 0) {
          const error = new Error("No result.");
          reject(error);
          return;
        }

        let result = choices[0].message.content.trim() as string;
        // remove prefix " and suffix "
        result = result.replace(/^"(.*)"$/, "$1") as string;

        console.warn(`---> openai result: ${result}`);
        resolve({
          type,
          queryWordInfo,
          translations: [result],
          result: {
            translatedText: result,
          },
        });
      })
      .catch((error: AxiosError) => {
        if (error.message === "canceled") {
          console.log(`---> openai canceled`);
          return reject(undefined);
        }

        if (error.name === "AbortError") {
          console.log("请求超时");
        }

        console.error(`---> OpenAI translate error: ${error}`);
        console.error("OpenAI error response: ", error.response);
        const errorInfo = getTypeErrorInfo(type, error);
        reject(errorInfo);
      });
  });
}
