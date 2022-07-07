/*
 * @author: tisfeng
 * @createTime: 2022-06-26 11:13
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-07-01 17:40
 * @fileName: scripts.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { LocalStorage, showToast, Toast } from "@raycast/api";
import { exec, execFile } from "child_process";
import { QueryWordInfo, RequestErrorInfo } from "./types";
import { LanguageDetectType, LanguageDetectTypeResult } from "./detectLanguage";
import { eudicBundleId } from "./components";
import { getLanguageItemFromYoudaoId } from "./utils";
import querystring from "node:querystring";

/**
 * run LanguageDetect shortcuts with the given text, return promise
 *
 * * NOTE: Apple language detect support more languages than apple translate!
 */
export function appleLanguageDetect(text: string): Promise<LanguageDetectTypeResult> {
  console.log(`start apple language detect: ${text}`);
  const startTime = new Date().getTime();
  const appleScript = getShortcutsScript("Easydict-LanguageDetect-V1.2.0", text);
  return new Promise((resolve, reject) => {
    // * NOTE: osascript -e param only support single quote 'xxx'
    exec(`osascript -e '${appleScript}'`, (error, stdout) => {
      if (error) {
        const errorInfo: RequestErrorInfo = {
          type: LanguageDetectType.Apple,
          message: error.message,
          code: error.code?.toString(),
        };
        reject(errorInfo);
      }

      const detectTypeResult: LanguageDetectTypeResult = {
        type: LanguageDetectType.Apple,
        youdaoLanguageId: stdout.trim(), // NOTE: need trim()
        confirmed: false,
      };
      resolve(detectTypeResult);
      const endTime = new Date().getTime();
      console.warn(`apple detect: ${detectTypeResult.youdaoLanguageId}, cost: ${endTime - startTime} ms`);
    });
  });
}

/**
 * Run apple Translate shortcuts with the given QueryWordInfo, return promise
 */
export function appleTranslate(queryTextInfo: QueryWordInfo): Promise<string | undefined> {
  const startTime = new Date().getTime();
  const appleFromLanguageId = getLanguageItemFromYoudaoId(queryTextInfo.fromLanguage).appleLanguageId;
  const appleToLanguageId = getLanguageItemFromYoudaoId(queryTextInfo.toLanguage).appleLanguageId;
  if (!appleFromLanguageId || !appleToLanguageId) {
    console.warn(`apple translate language not support: ${appleFromLanguageId} -> ${appleToLanguageId}`);
    return Promise.resolve(undefined);
  }

  const map = new Map([
    ["text", queryTextInfo.word],
    ["from", appleFromLanguageId], // * NOTE: if no from language, it will auto detect
    ["to", appleToLanguageId],
  ]);
  /**
   * * NOTE: thought apple translate support auto detect language, but it seems only support 12 languages currently that listed in consts.ts.
   * * If use auto detect and detected language is outside of 12 languages, it will throw language not support error.
   *
   * ? execution error: “Shortcuts Events”遇到一个错误：“翻译”可能不支持所提供文本的语言。 (-1753)
   */
  if (appleFromLanguageId === "auto") {
    map.delete("from"); // means use apple language auto detect
    console.log(
      `Apple translate currently not support translate language: ${appleFromLanguageId} -> ${appleToLanguageId}`
    );
  }

  const object = Object.fromEntries(map.entries());
  /**
   *  const jsonString = JSON.stringify(object); // {"text":"jsonString","from":"en_US","to":"zh_CN"}
   *  It seems that this method cannot handle special characters.: you're so beautiful, my "unfair" girl
   */
  const queryString = querystring.stringify(object);
  // console.warn(`queryString: ${queryString}`); // text=girl&from=en_US&to=zh_CN

  const appleScript = getShortcutsScript("Easydict-Translate-V1.2.0", queryString);
  return new Promise((resolve, reject) => {
    const command = `osascript -e '${appleScript}'`;
    exec(command, (error, stdout) => {
      if (error) {
        reject(error);
      }
      const translateText = stdout.trim();
      resolve(translateText);
      const endTime = new Date().getTime();
      console.warn(`apple translate: ${translateText}, cost: ${endTime - startTime} ms`);
      if (translateText.length === 0) {
        console.log(`apple translate error?: ${translateText}`);
        console.log(`${command}`);
      }
    });
  });
}

/**
 * get shortcuts script template string according to shortcut name and input
 *
 * * NOTE: To run a shortcut in the background, without opening the Shortcuts app, tell 'Shortcuts Events' instead of 'Shortcuts'.
 */
function getShortcutsScript(shortcutName: string, input: string): string {
  /**
   * * NOTE: First, exec osascript -e 'xxx', internal param only allow double quote, so single quote have to be instead of double quote.
   * * Then, the double quote in the input must be escaped.
   */
  const escapedInput = input.replace(/'/g, '"').replace(/"/g, '\\"'); // test: oh girl you're so beautiful, my "unfair" girl
  const appleScriptContent = `
        tell application "Shortcuts Events"
          run the shortcut named "${shortcutName}" with input "${escapedInput}"
        end tell
      `;
  return appleScriptContent;
}

/**
 * open Eudic App with queryText
 */
export const openInEudic = (queryText: string) => {
  const url = `eudic://dict/${queryText}`;
  execFile("open", [url], (error) => {
    if (error) {
      console.log("error:", error);
      LocalStorage.removeItem(eudicBundleId);

      showToast({
        title: "Eudic is not installed.",
        style: Toast.Style.Failure,
      });
    }
  });
};

/**
 * Exec osascript to post notification with title and content
 */
export function postNotification(content: string, title: string, subtitle = "") {
  const appleScript = `osascript -e 'display notification "${content}" with title "${title}" subtitle "${subtitle}"'`;
  exec(appleScript, (error) => {
    if (error) {
      console.log("postNotification error:", error);
    }
  });
}
