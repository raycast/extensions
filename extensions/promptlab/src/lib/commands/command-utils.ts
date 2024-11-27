import { objcImports, replaceAllHandler, rselectHandler, splitHandler, trimHandler } from "../scripts";
import { exec } from "child_process";
import { Command, CommandOptions, StoreCommand } from "./types";
import { LocalStorage, AI } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { PLApplicator } from "placeholders-toolkit";
import { loadCustomPlaceholders } from "../placeholders/utils";
import { loadAdvancedSettingsSync } from "../storage-utils";
import { PromptLabPlaceholders } from "../placeholders";

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
  type?: string,
) => {
  const settings = loadAdvancedSettingsSync();
  const customPlaceholders = await loadCustomPlaceholders(settings);

  try {
    if (type == "applescript" || type == undefined) {
      await runAppleScript(
        await PLApplicator.bulkApply(
          `${objcImports}
      ${splitHandler}
      ${trimHandler}
      ${replaceAllHandler}
      ${rselectHandler}
      set prompt to "${prompt.replaceAll('"', '\\"')}"
      set input to "${input.replaceAll('"', '\\"')}"
      set response to "${response.replaceAll('"', '\\"')}"
      ${script}`,
          { customPlaceholders, defaultPlaceholders: PromptLabPlaceholders },
        ),
      );
    } else if (type == "zsh") {
      const runScript = (script: string): Promise<string> => {
        const shellScript = `response="${response.trim().replaceAll('"', '\\"').replaceAll("\n", "\\n")}"
        prompt="${prompt.trim().replaceAll('"', '\\"').replaceAll("\n", "\\n")}"
        input="${input.trim().replaceAll('"', '\\"').replaceAll("\n", "\\n")}"
        ${script.replaceAll("\n", " && ")}`;

        return new Promise((resolve, reject) => {
          PLApplicator.bulkApply(shellScript, { customPlaceholders, defaultPlaceholders: PromptLabPlaceholders }).then(
            (subbedScript) => {
              exec(subbedScript, (error, stdout) => {
                if (error) {
                  reject(error);
                  return;
                }
                resolve(stdout);
              });
            },
          );
        });
      };
      await runScript(script);
    }
  } catch (error) {
    console.error(error);
  }
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

const camelize = (str: string) => {
  return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
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
  context: { [key: string]: string },
  disallowedCommands: string[],
  options?: CommandOptions,
): Promise<string> => {
  let subbedPrompt = prompt;

  // Replace config placeholders
  if (options != undefined && options.setupConfig != undefined) {
    for (const field of options.setupConfig.fields) {
      const regex = new RegExp(`{{config:${camelize(field.name.trim())}}}`, "g");
      const configFieldMatches = subbedPrompt.match(regex) || [];
      for (const m of configFieldMatches) {
        subbedPrompt = subbedPrompt.replaceAll(m, (field.value as string) || "");
      }
    }
  }

  const settings = loadAdvancedSettingsSync();
  const customPlaceholders = await loadCustomPlaceholders(settings);
  subbedPrompt = await PLApplicator.bulkApply(subbedPrompt, {
    context,
    customPlaceholders,
    defaultPlaceholders: PromptLabPlaceholders,
  });

  // Replace command placeholders
  for (const cmdString of Object.values(await LocalStorage.allItems())) {
    const cmd = JSON.parse(cmdString) as Command;
    if (
      !disallowedCommands.includes(cmd.name) &&
      (subbedPrompt.includes(`{{${cmd.name}}}`) || subbedPrompt.includes(`{{${cmd.id}}}`))
    ) {
      const cmdResponse = await AI.ask(
        await runReplacements(cmd.prompt, context, [cmd.name, cmd.id, ...disallowedCommands]),
      );
      if (cmd.actionScript != undefined && cmd.actionScript.trim().length > 0 && cmd.actionScript != "None") {
        await runActionScript(cmd.actionScript, cmd.prompt, "", cmdResponse, cmd.scriptKind);
      }
      subbedPrompt = subbedPrompt.replaceAll(`{{${cmd.name}}}`, cmdResponse);
      subbedPrompt = subbedPrompt.replaceAll(`{{${cmd.id}}}`, cmdResponse);
    }
  }

  return subbedPrompt;
};
