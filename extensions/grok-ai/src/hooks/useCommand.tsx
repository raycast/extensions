import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { CommandHook, Command, Model } from "../type";
import { useModel } from "./useModel";

// Debug logging utility
function debugLog<T>(message: string, data?: T) {
  console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : "");
}

export const COMMAND_MODEL_PREFIX = "command";
export const DEFAULT_AI_COMMAND_ID_PREFIX: string = "default";
export const FIX_SPELLING_AND_GRAMMAR_COMMAND_ID: string = `${DEFAULT_AI_COMMAND_ID_PREFIX}-fix-spelling-and-grammar`;
export const IMPROVE_WRITING_COMMAND_ID: string = `${DEFAULT_AI_COMMAND_ID_PREFIX}-improve-writing`;
export const DEFAULT_COMMANDS: Record<string, Command> = {
  [FIX_SPELLING_AND_GRAMMAR_COMMAND_ID]: {
    id: FIX_SPELLING_AND_GRAMMAR_COMMAND_ID,
    name: "Fix Spelling and Grammar",
    prompt:
      "You are Grok, an assistant that fixes spelling, grammar, and punctuation. Provide only the corrected text " +
      "without extra information. If the user requests clarifications, answer them in detail.",
    model: "grok-3-mini-fast-beta",
    temperature: "0.7",
    contentSource: "selectedText",
    isDisplayInput: true,
  },
  [IMPROVE_WRITING_COMMAND_ID]: {
    id: IMPROVE_WRITING_COMMAND_ID,
    name: "Improve Writing",
    prompt: `You are Grok, a spelling corrector, content writer, and text improver/editor. Reply with the rewritten text.
After receiving corrections, the user can request clarifications, and you must answer them in detail.
Strictly follow these rules:
- Correct spelling, grammar, and punctuation errors in the given text
- Enhance clarity and conciseness without altering the original meaning
- Divide lengthy sentences into shorter, more readable ones
- Eliminate unnecessary repetition while preserving important points
- Prioritize active voice over passive voice for a more engaging tone
- Opt for simpler, more accessible vocabulary when possible
- ALWAYS ensure the original meaning and intention of the given text
- ALWAYS detect and maintain the original language of the text
- ALWAYS maintain the existing tone of voice and style, e.g. formal, casual, polite, etc.
- NEVER surround the improved text with quotes or any additional formatting
- If the text is already well-written and requires no improvement, don't change the given text`,
    model: "grok-3-mini-fast-beta",
    temperature: "0.7",
    contentSource: "selectedText",
    isDisplayInput: true,
  },
  [`${DEFAULT_AI_COMMAND_ID_PREFIX}-summarize-webpage`]: {
    id: `${DEFAULT_AI_COMMAND_ID_PREFIX}-summarize-webpage`,
    name: "Summarize Webpage",
    prompt:
      "You are Grok, a helpful assistant. Read and summarize the main ideas and key points from this text. " +
      "Provide a concise and clear summary.",
    model: "grok-3-mini-fast-beta",
    temperature: "1",
    contentSource: "browserTab",
    isDisplayInput: false,
  },
};
const COMMANDS_STORAGE_KEY = "grok_commands";

export function useCommand(): CommandHook {
  const { add: addModel, update: updateModel, remove: removeModel } = useModel();
  const [data, setData] = useState<Record<string, Command>>({});
  const [isLoading, setLoading] = useState<boolean>(true);
  const isInitialMount = useRef(true);

  useEffect(() => {
    (async () => {
      debugLog("Loading commands from storage");
      const storedCommands: Record<string, Command> = JSON.parse(
        (await LocalStorage.getItem<string>(COMMANDS_STORAGE_KEY)) || "{}",
      );

      if (Object.keys(storedCommands).length === 0) {
        debugLog("No stored commands, using defaults", { commandCount: Object.keys(DEFAULT_COMMANDS).length });
        setData(DEFAULT_COMMANDS);
        Object.values(DEFAULT_COMMANDS).forEach((cmd) => {
          debugLog("Adding default command model", { commandId: cmd.id });
          addModel(mapCommandToModel(cmd));
        });
      } else {
        const allCommands: Record<string, Command> = { ...storedCommands };
        Object.keys(DEFAULT_COMMANDS).forEach((defaultKey) => {
          if (!storedCommands[defaultKey]) {
            debugLog("Adding missing default command", { commandId: defaultKey });
            allCommands[defaultKey] = DEFAULT_COMMANDS[defaultKey];
          }
        });
        debugLog("Loaded commands", { commandCount: Object.keys(allCommands).length });
        setData(allCommands);
        Object.values(allCommands).forEach((cmd) => {
          debugLog("Adding command model", { commandId: cmd.id });
          addModel(mapCommandToModel(cmd));
        });
      }
      setLoading(false);
      isInitialMount.current = false;
    })();
  }, [addModel]);

  useEffect(() => {
    if (isInitialMount.current) {
      return;
    }
    debugLog("Saving commands to storage", { commandCount: Object.keys(data).length });
    LocalStorage.setItem(COMMANDS_STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const add = useCallback(
    async (command: Command) => {
      debugLog("Adding command", { commandId: command.id, commandName: command.name });
      await showToast({
        title: "Saving your Grok command...",
        style: Toast.Style.Animated,
      });
      setData((prevData) => ({ ...prevData, [command.id]: command }));
      addModel(mapCommandToModel(command));
      await showToast({
        title: "Grok command saved!",
        style: Toast.Style.Success,
      });
    },
    [addModel, setData],
  );

  const update = useCallback(
    async (command: Command) => {
      debugLog("Updating command", { commandId: command.id, commandName: command.name });
      await showToast({
        title: "Updating your Grok command...",
        style: Toast.Style.Animated,
      });
      setData((prevData) => ({
        ...prevData,
        [command.id]: {
          ...prevData[command.id],
          ...command,
          updated_at: new Date().toISOString(),
        },
      }));
      await showToast({
        title: "Grok command updated!",
        style: Toast.Style.Success,
      });
    },
    [updateModel, setData],
  );

  const remove = useCallback(
    async (command: Command) => {
      debugLog("Removing command", { commandId: command.id, commandName: command.name });
      await showToast({
        title: "Removing your Grok command...",
        style: Toast.Style.Animated,
      });
      setData((prevData) => {
        const newData = { ...prevData };
        delete newData[command.id];
        return newData;
      });
      removeModel(mapCommandToModel(command));
      await showToast({
        title: "Grok command removed!",
        style: Toast.Style.Success,
      });
    },
    [removeModel, setData],
  );

  const clear = useCallback(async () => {
    debugLog("Clearing commands");
    await showToast({
      title: "Clearing Grok commands...",
      style: Toast.Style.Animated,
    });

    Object.values(data).forEach((cmd) => {
      debugLog("Removing command model", { commandId: cmd.id });
      removeModel(mapCommandToModel(cmd));
    });
    Object.values(DEFAULT_COMMANDS).forEach((cmd) => {
      debugLog("Adding default command model", { commandId: cmd.id });
      addModel(mapCommandToModel(cmd));
    });
    setData(DEFAULT_COMMANDS);

    await showToast({
      title: "Grok commands cleared!",
      style: Toast.Style.Success,
    });
  }, [removeModel, addModel, setData, data]);

  const setCommand = useCallback(
    async (commands: Record<string, Command>) => {
      debugLog("Setting commands", { commandCount: Object.keys(commands).length });
      setData(commands);
    },
    [setData],
  );

  const isDefault = useCallback((id: string): boolean => {
    const isDefaultCommand = id in DEFAULT_COMMANDS;
    debugLog("Checking if command is default", { commandId: id, isDefault: isDefaultCommand });
    return isDefaultCommand;
  }, []);

  return useMemo(
    () => ({ data, isLoading, add, update, remove, clear, setCommand, isDefault }),
    [data, isLoading, add, update, remove, clear, setCommand, isDefault],
  );
}

export function mapCommandToModel(command: Command): Model {
  const mappedModel = {
    id: `${COMMAND_MODEL_PREFIX}-${command.id}`,
    name: command.name,
    option: command.model,
    prompt: command.prompt,
    temperature: command.temperature,
    pinned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  debugLog("Mapped command to model", { commandId: command.id, modelId: mappedModel.id });
  return mappedModel;
}
