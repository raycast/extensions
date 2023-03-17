/*
 * @author: tisfeng
 * @createTime: 2023-03-14 22:11
 * @lastEditor: tisfeng
 * @lastEditTime: 2023-03-17 20:16
 * @fileName: chat.ts
 *
 * Copyright (c) 2023 by ${git_name}, All Rights Reserved.
 */

import axios, { AxiosError } from "axios";
import { httpsAgent } from "../../axiosConfig";
import { QueryWordInfo } from "../../dictionary/youdao/types";
import { AppKeyStore } from "../../preferences";
import { QueryTypeResult, TranslationType } from "../../types";
import { getTypeErrorInfo } from "../../utils";
import { fetchSSE } from "./utils";

export function requestOpenAIStreamTranslate(queryWordInfo: QueryWordInfo): Promise<QueryTypeResult> {
  console.warn(`---> start request OpenAI`);

  const url = "https://api.openai.com/v1/chat/completions";
  //   const prompt = `translate from English to Chinese:\n\n"No level of alcohol consumption is safe for our health." =>`;
  const prompt = `translate from ${queryWordInfo.fromLanguage} to ${queryWordInfo.toLanguage}:\n\n"${queryWordInfo.word}"`;
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

  return new Promise((resolve, reject) => {
    fetchSSE(`${url}`, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
      agent: httpsAgent,
      onMessage: (msg) => {
        // console.warn(`---> openai msg: ${JSON.stringify(msg)}`);

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

        if (isFirst && targetTxt && ["“", '"', "「"].indexOf(targetTxt[0]) >= 0) {
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
          console.log(`---> caiyun canceled`);
          return reject(undefined);
        }

        console.error(`---> OpenAI error: ${JSON.stringify(err)}`);

        let errorMessage = err.error.message ?? "Unknown error";
        console.warn(`openAIAPIKey: ${openAIAPIKey}`);
        if (openAIAPIKey.trim().length === 0) {
          errorMessage = `No OpenAI API key.`;
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

  const url = "https://api.openai.com/v1/chat/completions";
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

        console.error(`---> OpenAI translate error: ${error}`);
        console.error("OpenAI error response: ", error.response);
        let errorInfo = getTypeErrorInfo(type, error);
        if (openAIAPIKey.trim().length === 0) {
          errorInfo = {
            type: type,
            code: `401`,
            message: `No OpenAI API key.`,
          };
        }
        reject(errorInfo);
      });
  });
}
