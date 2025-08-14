import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { CommandHook, Command, Model } from "../type";
import { useModel } from "./useModel";

export const COMMAND_MODEL_PREFIX = "command";
export const DEFAULT_AI_COMMAND_ID_PREFIX: string = "default";
export const FIX_SPELLING_AND_GRAMMAR_COMMAND_ID: string = `${DEFAULT_AI_COMMAND_ID_PREFIX}-fix-spelling-and-grammar`;
export const IMPROVE_WRITING_COMMAND_ID: string = `${DEFAULT_AI_COMMAND_ID_PREFIX}-improve-writing`;
export const DEFAULT_COMMANDS: Record<string, Command> = {
  [FIX_SPELLING_AND_GRAMMAR_COMMAND_ID]: {
    id: FIX_SPELLING_AND_GRAMMAR_COMMAND_ID,
    name: "Fix Spelling and Grammar",
    prompt:
      "You are an assistant that fixes spelling, grammar and punctuation. Don't insert any " +
      "extra information; only provide the corrected text. After receiving corrections, the user can request " +
      "clarifications, and you need to answer them in detail.",
    model: "llama3.1-8b",
    temperature: "0.7",
    contentSource: "selectedText",
    isDisplayInput: true,
  },
  [IMPROVE_WRITING_COMMAND_ID]: {
    id: IMPROVE_WRITING_COMMAND_ID,
    name: "Improve Writing",
    prompt: `Act as a spelling corrector, content writer, and text improver/editor. Reply with the rewritten text.
After receiving corrections, the user can request clarifications, and you need to answer them in detail.
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
    model: "llama3.1-8b",
    temperature: "0.7",
    contentSource: "selectedText",
    isDisplayInput: true,
  },
  [`${DEFAULT_AI_COMMAND_ID_PREFIX}-summarize-webpage`]: {
    id: `${DEFAULT_AI_COMMAND_ID_PREFIX}-summarize-webpage`,
    name: "Summarize Webpage",
    prompt:
      "Read and summarize the main ideas and key points from this text. Summarize the information concisely and clearly.",
    model: "llama3.1-8b",
    temperature: "1",
    contentSource: "browserTab",
    isDisplayInput: false,
  },
};
const COMMANDS_STORAGE_KEY = "commands";

export function useCommand(): CommandHook {
  const { add: addModel, update: updateModel, remove: removeModel } = useModel();
  const [data, setData] = useState<Record<string, Command>>({});
  const [isLoading, setLoading] = useState<boolean>(true);
  const isInitialMount = useRef(true);

  useEffect(() => {
    (async () => {
      const storedCommands: Record<string, Command> = JSON.parse(
        (await LocalStorage.getItem<string>(COMMANDS_STORAGE_KEY)) || "{}",
      );

      if (Object.keys(storedCommands).length === 0) {
        setData(DEFAULT_COMMANDS);
        Object.values(DEFAULT_COMMANDS).forEach((cmd) => {
          addModel(mapCommandToModel(cmd));
        });
      } else {
        const allCommands: Record<string, Command> = { ...storedCommands };
        Object.keys(DEFAULT_COMMANDS).forEach((defaultKey) => {
          if (!storedCommands[defaultKey]) {
            allCommands[defaultKey] = DEFAULT_COMMANDS[defaultKey];
          }
        });
        setData(allCommands);
        Object.values(allCommands).forEach((cmd) => {
          addModel(mapCommandToModel(cmd));
        });
      }
      setLoading(false);
      isInitialMount.current = false;
    })();
  }, []);

  useEffect(() => {
    // Avoid saving when initial loading
    if (isInitialMount.current) {
      return;
    }
    LocalStorage.setItem(COMMANDS_STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const add = useCallback(
    async (command: Command) => {
      const toast = await showToast({
        title: "Saving your AI command...",
        style: Toast.Style.Animated,
      });
      setData((prevData) => ({ ...prevData, [command.id]: command }));
      addModel(mapCommandToModel(command));
      toast.title = "AI command saved!";
      toast.style = Toast.Style.Success;
    },
    [addModel, setData, data],
  );

  const update = useCallback(
    async (command: Command) => {
      const toast = await showToast({
        title: "Updating your AI command...",
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
      toast.title = "AI command updated!";
      toast.style = Toast.Style.Success;
    },
    [updateModel, setData, data],
  );

  const remove = useCallback(
    async (command: Command) => {
      const toast = await showToast({
        title: "Removing your AI command...",
        style: Toast.Style.Animated,
      });
      setData((prevData) => {
        const newData = { ...prevData };
        delete newData[command.id];
        return newData;
      });
      removeModel(mapCommandToModel(command));
      toast.title = "AI command removed!";
      toast.style = Toast.Style.Success;
    },
    [removeModel, setData, data],
  );

  const clear = useCallback(async () => {
    const toast = await showToast({
      title: "Clearing AI commands...",
      style: Toast.Style.Animated,
    });

    Object.values(data).forEach((cmd) => {
      removeModel(mapCommandToModel(cmd));
    });
    Object.values(DEFAULT_COMMANDS).forEach((cmd) => {
      addModel(mapCommandToModel(cmd));
    });
    setData(DEFAULT_COMMANDS);

    toast.title = "AI commands cleared!";
    toast.style = Toast.Style.Success;
  }, [removeModel, setData, data]);

  const setCommand = useCallback(
    async (commands: Record<string, Command>) => {
      setData(commands);
    },
    [setData],
  );

  const isDefault = useCallback((id: string): boolean => {
    return id in DEFAULT_COMMANDS;
  }, []);

  return useMemo(
    () => ({ data, isLoading, add, update, remove, clear, setCommand, isDefault }),
    [data, isLoading, add, update, remove, clear, setCommand, isDefault],
  );
}

export function mapCommandToModel(command: Command): Model {
  return {
    id: `${COMMAND_MODEL_PREFIX}-${command.id}`,
    name: command.name,
    option: command.model,
    prompt: command.prompt,
    temperature: command.temperature,
    pinned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
