import * as Types from "./types";
import * as Enum from "./enum";
import { OllamaServer, ThinkingEffort as ThinkingEffortOllama } from "../ollama/types";
import { LocalStorage, getPreferenceValues } from "@raycast/api";

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

const GLOBAL_DEFAULTS_KEY = "ollama_global_defaults";

/**
 * Get Global Default Model Settings from LocalStorage, falling back to Preferences.
 * @returns Global Default Model Settings.
 */
export async function GetGlobalDefaultModel(): Promise<{
  server: string;
  model: string;
  thinking: string;
  keepAlive: string;
}> {
  // Preferences are the primary source of truth
  const preferences = getPreferenceValues<Preferences>();
  const getStringPref = (val: string | number | boolean | undefined): string => {
    if (typeof val === "string") return val;
    if (typeof val === "number") return String(val);
    if (typeof val === "boolean") return val ? "true" : "false";
    return "";
  };
  const serverPref = getStringPref(preferences.ollamaDefaultServer) || "Local";
  const modelPref = getStringPref(preferences.ollamaDefaultModel) || "";
  const thinkingPref = getStringPref(preferences.ollamaDefaultThinking) || "none";
  const keepAlivePref = getStringPref(preferences.ollamaDefaultKeepAlive) || "5m";

  // Allow LocalStorage override for explicit saves via form
  const stored: string | undefined = await LocalStorage.getItem(GLOBAL_DEFAULTS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object" && parsed !== null) {
        const obj = parsed as Record<string, unknown>;
        return {
          server: obj.server != null ? String(obj.server) : serverPref,
          model: obj.model != null ? String(obj.model) : modelPref,
          thinking: obj.thinking != null ? String(obj.thinking) : thinkingPref,
          keepAlive: obj.keepAlive != null ? String(obj.keepAlive) : keepAlivePref,
        };
      }
    } catch {
      // Use preferences
    }
  }
  return {
    server: serverPref,
    model: modelPref,
    thinking: thinkingPref,
    keepAlive: keepAlivePref,
  };
}

/**
 * Save Global Default Model Settings to LocalStorage.
 */
export async function SetGlobalDefaultModel(values: {
  server: string;
  model: string;
  thinking: string;
  keepAlive: string;
}): Promise<void> {
  await LocalStorage.setItem(GLOBAL_DEFAULTS_KEY, JSON.stringify(values));
}

/**
 * Get Resolved Settings for Command Answer (with fallback to global defaults).
 * @param command - command type.
 * @returns Resolved Settings.
 */
export async function GetResolvedSettingsCommandAnswer(
  command: Enum.CommandAnswer,
): Promise<Types.SettingsCommandAnswer> {
  try {
    const settings = await GetSettingsCommandAnswer(command);
    // Has custom settings if model tag is set
    if (settings.model.main.tag) {
      return settings;
    }
  } catch {
    // No custom settings, fall through to global defaults
  }
  // Fall back to global defaults
  const globalDefaults = await GetGlobalDefaultModel();
  const server = await GetOllamaServerByName(globalDefaults.server);
  return {
    server: globalDefaults.server,
    model: {
      main: {
        server: server,
        tag: globalDefaults.model,
        thinking: globalDefaults.thinking === "none" ? false : (globalDefaults.thinking as ThinkingEffortOllama),
        keep_alive: globalDefaults.keepAlive,
      },
    },
  };
}

/**
 * Check if Command has Custom Settings.
 * @param command - command type.
 * @returns True if command has custom settings.
 */
export async function HasCustomCommandSettings(command: Enum.CommandAnswer): Promise<boolean> {
  try {
    const settings = await GetSettingsCommandAnswer(command);
    return !!settings.model.main.tag;
  } catch {
    return false;
  }
}
