import * as Types from "./types";
import * as Enum from "./enum";
import { OllamaServer } from "../ollama/types";
import { LocalStorage } from "@raycast/api";

/**
 * Get Ollama Servers.
 * @returns List of Configured Ollama Server.
 */
export async function GetOllamaServers(): Promise<Map<string, OllamaServer>> {
  let o: Map<string, OllamaServer> = new Map();
  o.set("Local", { url: "http://127.0.0.1:11434" });
  const j = await LocalStorage.getItem(`settings_ollama_servers`);
  if (j) o = new Map([...o, ...JSON.parse(j as string)]);
  return o;
}

/**
 * Get Ollama Servers without "Local".
 * @returns List of Configured Ollama Server.
 */
async function GetOllamaServersLocalStorage(): Promise<Map<string, OllamaServer>> {
  let o: Map<string, OllamaServer> = new Map();
  const j = await LocalStorage.getItem(`settings_ollama_servers`);
  if (j) o = new Map([...JSON.parse(j as string)]);
  return o;
}

/**
 * Get Ollama Server By Name.
 * @param name - Ollama Server Name.
 * @returns Ollama Server.
 */
export async function GetOllamaServerByName(name: string): Promise<OllamaServer> {
  if (name === "Local") return { url: "http://127.0.0.1:11434" };
  const j = await LocalStorage.getItem(`settings_ollama_servers`);
  if (!j) throw new Error("Given Ollama Server doesn't exist");
  const s: Map<string, OllamaServer> = new Map([...JSON.parse(j as string)]);
  if (!s.has(name)) throw new Error("Given Ollama Server doesn't exist");
  return s.get(name) as OllamaServer;
}

/**
 * Add Ollama Server.
 * @param name - server name.
 * @param server - server settings.
 */
export async function AddOllamaServers(name: string, server: OllamaServer): Promise<void> {
  const j = await GetOllamaServersLocalStorage();
  if ([...j.keys()].findIndex((n) => n === name) === -1) {
    j.set(name, server);
    await LocalStorage.setItem(`settings_ollama_servers`, JSON.stringify([...j.entries()]));
    return;
  }
  throw new Error("Name Already used");
}

/**
 * Edit Ollama Server.
 * @param name - server name.
 * @param server - server settings.
 */
export async function EditOllamaServers(name: string, server: OllamaServer): Promise<void> {
  const j = await GetOllamaServersLocalStorage();
  j.set(name, server);
  await LocalStorage.setItem(`settings_ollama_servers`, JSON.stringify([...j.entries()]));
}

/**
 * Delete Ollama Server.
 * @param name - server name.
 */
export async function DeleteOllamaServers(name: string): Promise<void> {
  const j = await GetOllamaServersLocalStorage();
  j.delete(name);
  await LocalStorage.setItem(`settings_ollama_servers`, JSON.stringify([...j.entries()]));
}

/**
 * Get Settings for Command Answere from LocalStorage.
 * @param command - command type.
 * @returns settings.
 */
export async function GetSettingsCommandAnswer(command: Enum.CommandAnswer): Promise<Types.SettingsCommandAnswer> {
  const j = await LocalStorage.getItem(`settings_command_${command}`);
  if (j) return JSON.parse(j as string);
  throw new Error("Settings for this Command unavailable");
}

/**
 * Save Settings for Command Answere to LocalStorage.
 * @param command - command type.
 * @param settings - settings to save
 */
export async function SetSettingsCommandAnswer(
  command: Enum.CommandAnswer,
  settings: Types.SettingsCommandAnswer,
): Promise<void> {
  await LocalStorage.setItem(`settings_command_${command}`, JSON.stringify(settings));
}

/**
 * Delete Settings for Command Answer from LocalStorage.
 * @param command - command type.
 */
export async function DeleteSettingsCommandAnswer(command: Enum.CommandAnswer): Promise<void> {
  await LocalStorage.removeItem(`settings_command_${command}`);
}

/**
 * Get Array of Chat Names.
 * @returns Array of Chat Names.
 */
export async function GetSettingsCommandChatNames(): Promise<string[]> {
  const c = await GetSettingsCommandChat();
  if (c.length === 0) throw new Error("No Saved Chat");
  return c.map((v): string => v.name);
}

/**
 * Get Settings Chat by Index.
 * @param i - index.
 * @returns Chat Setting.
 */
export async function GetSettingsCommandChatByIndex(i: number): Promise<Types.RaycastChat> {
  const c = await GetSettingsCommandChat();
  if (c[i]) return c[i];
  throw new Error("Chat on given index doesn't exist");
}

/**
 * Set Settings Chat by Index.
 * @param i - index.
 * @param chat - chat.
 */
export async function SetSettingsCommandChatByIndex(i: number, chat: Types.RaycastChat): Promise<void> {
  const c = await GetSettingsCommandChat();
  if (!c[i]) throw new Error("Chat on given index doesn't exist");
  c[i] = chat;
  await SetSettingsCommandChat(c);
}

/**
 * Add New Settings Chat.
 * @param chat - chat.
 */
export async function AddSettingsCommandChat(chat: Types.RaycastChat): Promise<void> {
  const c = await GetSettingsCommandChat().catch((): Types.RaycastChat[] => {
    return [];
  });
  c.unshift(chat);
  await SetSettingsCommandChat(c);
}

/**
 * Delete Settings Chat by Index.
 * @param i - index.
 */
export async function DeleteSettingsCommandChatByIndex(i: number): Promise<void> {
  let c = await GetSettingsCommandChat();
  c = c.filter((value, index) => index !== i);
  await SetSettingsCommandChat(c);
}

/**
 * Get Settings for Command Chat from LocalStorage.
 * @returns Command Chat Settings.
 */
async function GetSettingsCommandChat(): Promise<Types.RaycastChat[]> {
  const j = await LocalStorage.getItem(`setting_command_chat`);
  if (j) return JSON.parse(j as string);
  const jl = await GetLegacySettingsCommandChat().catch(() => undefined);
  if (jl) return jl;
  throw new Error("No saved chat");
}

/**
 * Save Settings for Command Chat to LocalStorage.
 */
async function SetSettingsCommandChat(chat: Types.RaycastChat[]): Promise<void> {
  await LocalStorage.setItem(`setting_command_chat`, JSON.stringify(chat));
}

/**
 * Get Legacy Settings dor Command Chat from LocalStorage.
 * @returns Command Chat Settings.
 */
async function GetLegacySettingsCommandChat(): Promise<Types.RaycastChat[]> {
  const jh = await LocalStorage.getItem("chat_history");
  if (jh) await LocalStorage.removeItem("chat_history");
  const jm = await LocalStorage.getItem("chat_model_generate");
  if (jm) await LocalStorage.removeItem("chat_model_generate");
  const je = await LocalStorage.getItem("chat_model_embedding");
  if (je) await LocalStorage.removeItem("chat_model_embedding");
  const ji = await LocalStorage.getItem("chat_model_image");
  if (ji) await LocalStorage.removeItem("chat_model_image");
  if (jh && jm) {
    const lh: Map<string, Types.LegacyRaycastChatMessage[]> = new Map(JSON.parse(jh as string));
    return [...lh.entries()].map((v): Types.RaycastChat => {
      return {
        name: v[0],
        models: {
          main: {
            server_name: "Local",
            server: {
              url: "http://127.0.0.1:11434",
            },
            tag: String(jm),
          },
          embedding: je
            ? {
                server_name: "Local",
                server: {
                  url: "http://127.0.0.1:11434",
                },
                tag: String(je),
              }
            : undefined,
          vision: ji
            ? {
                server_name: "Local",
                server: {
                  url: "http://127.0.0.1:11434",
                },
                tag: String(ji),
              }
            : undefined,
        },
        messages: v[1].map((v): Types.RaycastChatMessage => {
          return { images: v.images, files: v.sources, ...v };
        }),
      };
    });
  }
  throw new Error("No saved chat");
}

/**
 * Get Custom Commands from LocalStorage.
 * @returns Array of Custom Commands.
 */
export async function GetCustomCommands(): Promise<Types.CustomCommand[]> {
  const j = await LocalStorage.getItem("custom_commands");
  if (j) {
    try {
      return JSON.parse(j as string) as Types.CustomCommand[];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Get Custom Command by ID.
 * @param id - Command ID.
 * @returns Custom Command or undefined.
 */
export async function GetCustomCommandById(id: string): Promise<Types.CustomCommand | undefined> {
  const commands = await GetCustomCommands();
  return commands.find((c) => c.id === id);
}

/**
 * Save Custom Command (create or update).
 * @param command - Custom Command to save.
 */
export async function SaveCustomCommand(command: Types.CustomCommand): Promise<void> {
  const commands = await GetCustomCommands();
  const index = commands.findIndex((c) => c.id === command.id);
  const now = new Date().toISOString();
  if (index >= 0) {
    commands[index] = {
      ...commands[index],
      ...command,
      updatedAt: now,
    };
  } else {
    // Ensure unique ID/slug when adding new command
    const uniqueId = command.id || getUniqueSlug(command.title, commands);
    commands.unshift({
      ...command,
      id: uniqueId,
      createdAt: command.createdAt || now,
      updatedAt: now,
    });
  }
  await LocalStorage.setItem("custom_commands", JSON.stringify(commands));
}

/**
 * Delete Custom Command by ID.
 * @param id - Command ID.
 */
export async function DeleteCustomCommand(id: string): Promise<void> {
  let commands = await GetCustomCommands();
  commands = commands.filter((c) => c.id !== id);
  await LocalStorage.setItem("custom_commands", JSON.stringify(commands));
}

/**
 * Convert a string title to a URL-friendly slug.
 * @param text - Input title.
 * @returns Clean slug string.
 */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate a unique slug among existing custom commands.
 * @param title - The title to slugify.
 * @param existingCommands - Current custom commands.
 * @param currentId - Optional ID of the command currently being edited.
 * @returns Unique slug string.
 */
export function getUniqueSlug(title: string, existingCommands: Types.CustomCommand[], currentId?: string): string {
  const baseSlug = slugify(title) || "custom-command";
  let candidate = baseSlug;
  let counter = 1;

  while (existingCommands.some((c) => c.id === candidate && c.id !== currentId)) {
    counter++;
    candidate = `${baseSlug}-${counter}`;
  }

  return candidate;
}

/**
 * Generate Quicklink URL for a Custom Command.
 * @param id - Command ID (slug).
 * @returns Raycast Quicklink URL.
 */
export function getCustomCommandQuicklink(id: string): string {
  const scheme = process.env.RAYCAST_SCHEME ?? "raycast";
  return `${scheme}://extensions/anwarulislam/ai-commands/cmd-answer?arguments=${encodeURIComponent(
    JSON.stringify({ id }),
  )}`;
}
