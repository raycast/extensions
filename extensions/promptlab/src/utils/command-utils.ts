import { runAppleScript } from "run-applescript";
import {
  addFileToSelection,
  objcImports,
  replaceAllHandler,
  rselectHandler,
  splitHandler,
  trimHandler,
} from "./scripts";
import { filterString } from "./calendar-utils";
import {
  getMatchingYouTubeVideoID,
  getTextOfWebpage,
  getYouTubeVideoTranscriptById,
  getYouTubeVideoTranscriptByURL,
} from "./context-utils";
import { exec } from "child_process";
import * as os from "os";
import { Command, StoreCommand } from "./types";
import { LocalStorage, AI } from "@raycast/api";

/**
 * Runs the action script of a PromptLab command, providing the AI response as the `response` variable.
 *
 * The following handlers are provided:
 *  - `split(theString, theDelimiter)` - Splits text around a delimiter
 *  - `trim(theString)` - Removes leading and trailing spaces from text
 *  - `replaceAll(theString, theTarget, theReplacement)` - Replaces all instances of a target string with a replacement string
 *  - `rselect(theString, theDelimiter)` - Randomly selects a string from a list of strings
 *
 * The following AppleScriptObjC frameworks are supported and automatically imported: `AVFoundation`, `CoreLocation`, `CoreMedia`, `EventKit`, `Foundation`, `GamePlayKit`, `LatentSemanticMapping`, `MapKit`, `PDFKit`, `Photos`, `Quartz`, `SafariServices`, `ScreenCaptureKit`, `ScreenSaver`, `SoundAnalysis`, `Speech`, `Vision`, and `Webkit`
 *
 * @param script The script to execute.
 * @param response The PromptLab AI response.
 */
export const runActionScript = async (
  script: string,
  prompt: string,
  input: string,
  response: string,
  type?: string
) => {
  try {
    if (type == "applescript" || type == undefined) {
      await runAppleScript(`${objcImports}
      ${splitHandler}
      ${trimHandler}
      ${replaceAllHandler}
      ${rselectHandler}
      set prompt to "${prompt.replaceAll('"', '\\"')}"
      set input to "${input.replaceAll('"', '\\"')}"
      set response to "${response.replaceAll('"', '\\"')}"
      ${script}`);
    } else if (type == "zsh") {
      const runScript = (script: string): Promise<string> => {
        const shellScript = `response="${response.trim().replaceAll('"', '\\"').replaceAll("\n", "\\n")}"
        prompt="${prompt.trim().replaceAll('"', '\\"').replaceAll("\n", "\\n")}"
        input="${input.trim().replaceAll('"', '\\"').replaceAll("\n", "\\n")}"
        ${script.replaceAll("\n", " && ")}`;

        return new Promise((resolve, reject) => {
          exec(shellScript, (error, stdout) => {
            if (error) {
              reject(error);
              return;
            }
            resolve(stdout);
          });
        });
      };
      await runScript(script);
    }
  } catch (error) {
    console.error(error);
  }
};

/**
 * Replaces AppleScript placeholders with the output of the AppleScript.
 *
 * @param prompt The prompt to operate on.
 * @returns A promise resolving to the prompt with the `{{as:...}}` placeholders replaced.
 */
export const replaceAppleScriptPlaceholders = async (prompt: string) => {
  let subbedPrompt = prompt;
  const applescriptMatches = prompt.match(/{{as:(.*?[\s\n\r]*)*?}}/g) || [];
  for (const m of applescriptMatches) {
    const script = m.substring(5, m.length - 2);
    const output = await runAppleScript(script);
    subbedPrompt = filterString(subbedPrompt.replaceAll(m, output));
  }
  return subbedPrompt;
};

/**
 * Replaces shell script placeholders with the output of the shell script.
 *
 * @param prompt The prompt to operate on.
 * @returns A promise resolving to the prompt with the `{{shell:...}}` placeholders replaced.
 */
export const replaceShellScriptPlaceholders = async (prompt: string) => {
  let subbedPrompt = prompt;
  const shellScriptMatches = prompt.match(/{{shell:(.*?[\s\n\r]*)*?}}/g) || [];
  for (const m of shellScriptMatches) {
    const script = m.substring(8, m.length - 2);

    const runScript = (script: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        exec(script, (error, stdout) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(stdout);
        });
      });
    };

    const output = await runScript(script);
    subbedPrompt = filterString(subbedPrompt.replaceAll(m, output));
  }
  return subbedPrompt;
};

/**
 * Replaces URL placeholders with the text of the webpage.
 *
 * @param prompt The prompt to operate on.
 * @returns A promise resolving to the prompt with the `{{url:...}}` placeholders replaced.
 */
export const replaceURLPlaceholders = async (prompt: string) => {
  let subbedPrompt = prompt;
  const urlMatches = prompt.match(/{{(https?:(.| )*?)}}/g) || [];
  for (const m of urlMatches) {
    const url = encodeURI(m.substring(2, m.length - 2));
    const text = await getTextOfWebpage(url);
    subbedPrompt = subbedPrompt.replaceAll(m, filterString(text));
  }
  return subbedPrompt;
};

/**
 * Selects files specified by the `{{file:...}}` placeholder.
 *
 * @param prompt The prompt to operate on.
 * @returns A promise resolving to the prompt with the `{{file:...}}` placeholders removed.
 */
export const replaceFileSelectionPlaceholders = async (prompt: string) => {
  let subbedPrompt = prompt;
  const fileMatches = prompt.match(/{{file:[~/].*?}}/g) || [];
  for (const m of fileMatches) {
    const file = m.substring(7, m.length - 2).replace("~", os.homedir());
    addFileToSelection(file);
    subbedPrompt = subbedPrompt.replaceAll(m, "");
  }
  return subbedPrompt;
};

/**
 * Updates persistent data and replaces counter placeholders with the updated values.
 *
 * @param prompt The prompt to operate on.
 * @returns A promise resolving to the prompt with persistent data placeholders replaced.
 */
export const replaceCounterPlaceholders = async (prompt: string) => {
  let subbedPrompt = prompt;
  const incrementMatches = prompt.match(/{{increment:.*?}}/g) || [];
  const decrementMatches = prompt.match(/{{decrement:.*?}}/g) || [];

  for (const m of incrementMatches) {
    const identifier = "id-" + m.substring(10, m.length - 2);
    const value = parseInt((await LocalStorage.getItem(identifier)) || "0") + 1;
    await LocalStorage.setItem(identifier, value.toString());
    subbedPrompt = subbedPrompt.replaceAll(m, value.toString());
  }

  for (const m of decrementMatches) {
    const identifier = "id-" + m.substring(10, m.length - 2);
    const value = parseInt((await LocalStorage.getItem(identifier)) || "0") - 1;
    await LocalStorage.setItem(identifier, value.toString());
    subbedPrompt = subbedPrompt.replaceAll(m, value.toString());
  }

  return subbedPrompt;
};

export const replaceYouTubePlaceholders = async (prompt: string) => {
  let subbedPrompt = prompt;
  const youtubeMatches = prompt.match(/{{youtube:(.*?[\s\n\r]*)*?}}/g) || [];
  for (const m of youtubeMatches) {
    const specifier = m.substring(10, m.length - 2);
    const transcriptText = specifier.startsWith("http")
      ? await getYouTubeVideoTranscriptByURL(specifier)
      : await getYouTubeVideoTranscriptById(getMatchingYouTubeVideoID(specifier));
    subbedPrompt = subbedPrompt.replaceAll(m, filterString(transcriptText));
  }
  return subbedPrompt;
};

/**
 * Gets the importable JSON string representation of a command.
 *
 * @param command The command to get the JSON representation of.
 * @returns The JSON string representation of the command.
 */
export const getCommandJSON = (command: Command | StoreCommand) => {
  const cmdObj: { [key: string]: Command | StoreCommand } = {};
  cmdObj[command.name] = command;
  return JSON.stringify(cmdObj).replaceAll(/\\([^"])/g, "\\\\$1");
};

/**
 * Run placeholder replacements on a prompt.
 *
 * @param prompt The prompt to run replacements on.
 * @param replacements The list of replacements to run.
 * @param disallowedCommands The list of commands that are not allowed to be run in command placeholders.
 * @returns A promise resolving to the prompt with all placeholders replaced.
 */
export const runReplacements = async (
  prompt: string,
  replacements: {
    [key: string]: () => Promise<string>;
  },
  disallowedCommands: string[]
): Promise<string> => {
  // Replace simple placeholders (i.e. {{date}})
  let subbedPrompt = prompt;
  for (const key in replacements) {
    if (prompt.includes(key)) {
      subbedPrompt = subbedPrompt.replaceAll(key, await replacements[key]());
    }
  }

  // Replace complex placeholders (i.e. shell scripts, AppleScripts, etc.)
  subbedPrompt = await replaceCounterPlaceholders(subbedPrompt);
  subbedPrompt = await replaceYouTubePlaceholders(subbedPrompt);
  subbedPrompt = await replaceAppleScriptPlaceholders(subbedPrompt);
  subbedPrompt = await replaceShellScriptPlaceholders(subbedPrompt);
  subbedPrompt = await replaceURLPlaceholders(subbedPrompt);
  subbedPrompt = await replaceFileSelectionPlaceholders(subbedPrompt);

  // Replace command placeholders
  for (const cmdString of Object.values(await LocalStorage.allItems())) {
    const cmd = JSON.parse(cmdString) as Command;
    if (!disallowedCommands.includes(cmd.name) && subbedPrompt.includes(`{{${cmd.name}}}`)) {
      const cmdResponse = await AI.ask(
        await runReplacements(cmd.prompt, replacements, [cmd.name, ...disallowedCommands])
      );
      if (cmd.actionScript != undefined && cmd.actionScript.trim().length > 0 && cmd.actionScript != "None") {
        await runActionScript(cmd.actionScript, cmd.prompt, "", cmdResponse, cmd.scriptKind);
      }
      subbedPrompt = subbedPrompt.replaceAll(`{{${cmd.name}}}`, cmdResponse);
    }
  }

  return subbedPrompt;
};
