/*
 * @author: tisfeng
 * @createTime: 2022-06-26 11:13
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-09-03 00:28
 * @fileName: scripts.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { showToast, Toast } from "@raycast/api";
import { exec, execFile } from "child_process";
import querystring from "node:querystring";
import { LanguageDetectType, LanguageDetectTypeResult } from "./detectLanauge/types";
import { QueryWordInfo } from "./dictionary/youdao/types";
import { getAppleLanguageId, getYoudaoLanguageIdFromAppleId } from "./language/languages";
import { AbortObject, RequestErrorInfo, TranslationType } from "./types";

const execTimeout = 10000; // 10s

/**
 * Run apple Translate shortcuts with the given QueryWordInfo. Cost time: ~0.5s.
 *
 * * Since this is an experimental feature, may be sucked in long time, so we set a max time to cancel it.
 */
export function appleTranslate(
  queryTextInfo: QueryWordInfo,
  abortObject: AbortObject | undefined,
  timeout = execTimeout
): Promise<string | undefined> {
  console.log(`---> start Apple translate`);

  const { word, fromLanguage, toLanguage } = queryTextInfo;
  const startTime = new Date().getTime();
  const appleFromLanguageId = getAppleLanguageId(fromLanguage);
  const appleToLanguageId = getAppleLanguageId(toLanguage);
  const type = TranslationType.Apple;

  if (!appleFromLanguageId || !appleToLanguageId) {
    console.warn(`apple translate language not support: ${fromLanguage} -> ${toLanguage}`);
    return Promise.resolve(undefined);
  }

  const map = new Map([
    ["text", word],
    ["from", appleFromLanguageId], // * NOTE: if no from language, it will auto detect
    ["to", appleToLanguageId],
  ]);
  /**
   * * NOTE: thought apple translate support auto detect language, but it seems only support 12 languages currently that listed in consts.ts.
   * * If use auto detect and detected language is outside of 12 languages, it will throw language not support error.
   *
   * ? execution error: “Shortcuts Events”遇到一个错误：“翻译”可能不支持所提供文本的语言。 (-1753)
   * ? execution error: “Shortcuts Events”遇到一个错误：Translation from 英语（美国） to 中文（台湾） is not supported. (-1753)\n"
   */
  if (appleFromLanguageId === "auto") {
    map.delete("from"); // means use apple language auto detect
    console.warn(`Apple translate currently not support auto detect this language: ${word}`);
    return Promise.resolve(undefined);
  }

  const object = Object.fromEntries(map.entries());
  /**
   *  const jsonString = JSON.stringify(object); // {"text":"jsonString","from":"en_US","to":"zh_CN"}
   *  It seems that this method cannot handle special characters.: you're so beautiful, my "unfair" girl
   */
  const queryString = querystring.stringify(object);
  // console.log(`queryString: ${queryString}`); // text=girl&from=en_US&to=zh_CN

  const appleScript = getShortcutsScript("Easydict-Translate-V1.2.0", queryString);
  return new Promise((resolve, reject) => {
    const command = `osascript -e '${appleScript}'`;

    const childProcess = exec(command, (error, stdout, stderr) => {
      if (error) {
        if (error.killed) {
          // error: { "killed": true, "code": null, "signal": "SIGTERM" }
          console.warn(`---> apple translate canceled`);
          // console.log(`error: ${JSON.stringify(error, null, 4)}`)
          return reject(undefined);
        }

        console.error(`apple error: ${JSON.stringify(error, null, 4)}`);
        console.warn(`Apple translate error: ${command}`);
        const errorInfo: RequestErrorInfo = {
          type: type,
          message: stderr,
        };
        return reject(errorInfo);
      }

      const translateText = stdout.trim();
      console.warn(`Apple translate: ${translateText}, cost: ${new Date().getTime() - startTime} ms`);
      resolve(translateText);
    });

    if (abortObject) {
      abortObject.childProcess = childProcess;
    }

    // If timeout, kill exec child process.
    setTimeout(() => {
      // console.log(`---> apple translate timeout: ${JSON.stringify(childProcess, null, 4)}`);
      if (childProcess.killed || childProcess.exitCode === 0) {
        console.warn(`---> apple translate already finished`);
        return reject(undefined);
      }

      childProcess.kill();
      console.error(`apple translate timeout, kill exec child process: ${JSON.stringify(childProcess, null, 4)}`);
      const errorInfo: RequestErrorInfo = {
        type: type,
        message: `timeout of ${timeout} exceeded`,
      };
      reject(errorInfo);
    }, timeout);
  });
}

/**
 * run LanguageDetect shortcuts with the given text. Cost time: ~0.4s
 *
 * * NOTE: Apple language detect support more languages than apple translate!
 */
export function appleLanguageDetect(text: string, timeout = execTimeout): Promise<LanguageDetectTypeResult> {
  console.log(`start apple language detect: ${text}`);
  const startTime = new Date().getTime();
  const appleScript = getShortcutsScript("Easydict-LanguageDetect-V1.2.0", text);
  const type = LanguageDetectType.Apple;

  return new Promise((resolve, reject) => {
    // * NOTE: osascript -e param only support single quote 'xxx'
    const childProcess = exec(`osascript -e '${appleScript}'`, (error, stdout) => {
      if (error) {
        if (error.killed) {
          // error: { "killed": true, "signal": "SIGTERM" }
          console.warn(`---> apple detect language canceled`);
          return reject(undefined);
        }

        console.error(`Apple detect error: ${error}`);
        const errorInfo: RequestErrorInfo = {
          type: type,
          message: error.message,
          code: error.code?.toString(),
        };
        return reject(errorInfo);
      }

      // * maybe have line break, so trim it.
      const appleLanguageId = stdout.trim(); // will be "" when detect language is not support, eg. ꯅꯨꯄꯤꯃꯆꯥ
      console.warn(`apple detect language: ${appleLanguageId}, cost: ${new Date().getTime() - startTime} ms`);
      const youdaoLanguageId = getYoudaoLanguageIdFromAppleId(appleLanguageId);
      const detectTypeResult: LanguageDetectTypeResult = {
        type: type,
        sourceLanguageId: appleLanguageId,
        youdaoLanguageId: youdaoLanguageId,
        confirmed: false,
      };
      console.warn(`final apple detect language: ${appleLanguageId}, youdaoId: ${youdaoLanguageId}`);
      resolve(detectTypeResult);
    });

    setTimeout(() => {
      if (childProcess.killed || childProcess.exitCode === 0) {
        console.warn(`---> apple detect language already finished`);
        return reject(undefined);
      }

      childProcess.kill();
      console.error(`apple detect language timeout, kill exec child process: ${JSON.stringify(childProcess, null, 4)}`);
      const errorInfo: RequestErrorInfo = {
        type: type,
        message: `timeout of ${timeout} exceeded`,
      };
      reject(errorInfo);
    }, timeout);
  });
}

/**
 * Get shortcuts script template string according to shortcut name and input.
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
  // console.log(`apple script: ${appleScriptContent}`);
  return appleScriptContent;
}

/**
 * Open Eudic App with queryText.
 *
 * eudic://dict/good
 */
export const openInEudic = (queryText: string) => {
  const url = `eudic://dict/${queryText}`;
  execFile("open", [url], (error) => {
    if (error) {
      console.error(`open in eudic error: ${error}`);
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

export function exitExtension() {
  console.log("exit extension");
  // use cmd+W to close the extension, maybe delay a little bit, 0.5s
  const appleScript = `
    tell application "System Events"
    key code 13 using {command down}
    end tell
    `;

  exec(`osascript -e '${appleScript}'`, (err, stdout) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });
}
