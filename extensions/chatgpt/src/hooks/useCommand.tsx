import { useMemo } from "react";
import type { Command, CommandHook } from "../type";
import { DEFAULT_COMMANDS } from "../utils/model-defaults";
import { modelCatalog, saveConfiguration, useModelCatalog } from "./useModelCatalog";
export {
  COMMAND_MODEL_PREFIX,
  DEFAULT_AI_COMMAND_ID_PREFIX,
  FIX_SPELLING_AND_GRAMMAR_COMMAND_ID,
  IMPROVE_WRITING_COMMAND_ID,
  DEFAULT_COMMANDS,
} from "../utils/model-defaults";

const actions = {
  add: (command: Command) => saveConfiguration(() => modelCatalog.saveCommand(command), "AI command saved"),
  update: (command: Command) => saveConfiguration(() => modelCatalog.saveCommand(command), "AI command updated"),
  remove: (command: Command) => saveConfiguration(() => modelCatalog.removeCommand(command), "AI command removed"),
  clear: () => saveConfiguration(() => modelCatalog.setCommands(DEFAULT_COMMANDS), "AI commands reset"),
  setCommand: modelCatalog.setCommands,
  isDefault: (id: string) => id in DEFAULT_COMMANDS,
  resolveModel: modelCatalog.resolveModel,
};

export function useCommand(): CommandHook {
  const { catalog, isLoading } = useModelCatalog();
  return useMemo(() => ({ data: catalog.commands, isLoading, ...actions }), [catalog, isLoading]);
}
