import { LocalStorage } from "@raycast/api";
import { commandStoreSpec } from "../lib/commands/schema";
import { starterCommands } from "../lib/commands/starters";
import {
  COMMAND_STORE_VERSION,
  COMMANDS_BACKUP_KEY,
  COMMANDS_STORAGE_KEY,
  type AiCommand,
  type CommandDefaults,
} from "../lib/commands/types";
import { backupKey, isNewerStore, planVersionedLoad } from "../lib/versioned-store";
import { getSettings } from "./settings";

export interface LoadedCommands {
  commands: AiCommand[];
  readOnly: boolean;
  notice?: string;
}

const NOTICES = {
  corrupt: "Saved commands could not be read. A backup was kept and the starter commands were restored.",
  partial: "Some saved commands could not be read and were backed up.",
  newer: "These commands were saved by a newer version of Local AI. Update the extension to edit them.",
};

export async function loadCommands(): Promise<LoadedCommands> {
  const defaults = commandDefaults();
  const plan = planVersionedLoad(
    await LocalStorage.getItem<string>(COMMANDS_STORAGE_KEY),
    commandStoreSpec(defaults),
    () => ({ version: COMMAND_STORE_VERSION, commands: starterCommands(new Date().toISOString(), defaults) }),
  );
  if (plan.readOnly) return { commands: [], readOnly: true, notice: NOTICES.newer };

  if (plan.backup !== undefined) await LocalStorage.setItem(backupKey(COMMANDS_BACKUP_KEY, new Date()), plan.backup);
  if (plan.save) await saveCommands(plan.store.commands);
  return { commands: plan.store.commands, readOnly: false, notice: plan.notice && NOTICES[plan.notice] };
}

export async function saveCommands(commands: AiCommand[]): Promise<void> {
  if (isNewerStore(await LocalStorage.getItem<string>(COMMANDS_STORAGE_KEY), COMMAND_STORE_VERSION)) {
    throw new Error(NOTICES.newer);
  }
  await LocalStorage.setItem(COMMANDS_STORAGE_KEY, JSON.stringify({ version: COMMAND_STORE_VERSION, commands }));
}

function commandDefaults(): CommandDefaults {
  const settings = getSettings();
  return { model: settings.defaultModel, creativity: settings.defaultCreativity };
}
