import { AiCommand, BUILTIN_COMMANDS } from "./presets";
import { readJson, updateJson } from "./store";
import { newId } from "./text";

const FILE = "commands.json";

export function loadCustomCommands(): Promise<AiCommand[]> {
  return readJson<AiCommand[]>(FILE, []);
}

export async function saveCustomCommand(command: Omit<AiCommand, "id"> & { id?: string }): Promise<AiCommand> {
  const saved: AiCommand = { ...command, id: command.id ?? `custom-${newId()}`, builtin: false };
  await updateJson<AiCommand[]>(FILE, [], (list) => {
    const index = list.findIndex((c) => c.id === saved.id);
    if (index >= 0) list[index] = saved;
    else list.push(saved);
    return list;
  });
  return saved;
}

export async function deleteCustomCommand(id: string): Promise<void> {
  await updateJson<AiCommand[]>(FILE, [], (list) => list.filter((c) => c.id !== id));
}

export async function findCommand(id: string): Promise<AiCommand | undefined> {
  return BUILTIN_COMMANDS.find((c) => c.id === id) ?? (await loadCustomCommands()).find((c) => c.id === id);
}
