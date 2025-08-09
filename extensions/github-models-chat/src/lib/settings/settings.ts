import * as Types from "./types";
import * as SettingsEnum from "./enum";
import { OllamaServer } from "../ollama/types";
import { OllamaServerAuthorizationMethod } from "../ollama/enum";
import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types";

/**
 * Get GitHub Models server config from preferences.
 */
function getGitHubServer(): OllamaServer {
  const prefs = getPreferenceValues<Preferences>();
  return {
    url: "https://models.github.ai",
    auth: prefs.githubToken ? { mode: OllamaServerAuthorizationMethod.BEARER, token: prefs.githubToken } : undefined,
  };
}

/**
 * Get Servers (GitHub only).
 * @returns List of Configured Servers.
 */
export async function GetOllamaServers(): Promise<Map<string, OllamaServer>> {
  const o: Map<string, OllamaServer> = new Map();
  o.set("GitHub", getGitHubServer());
  return o;
}

/**
 * Get Servers without defaults (not used anymore, kept for compatibility).
 */
async function GetOllamaServersLocalStorage(): Promise<Map<string, OllamaServer>> {
  const o: Map<string, OllamaServer> = new Map();
  const j = await LocalStorage.getItem(`settings_ollama_servers`);
  if (j) return new Map([...JSON.parse(j as string)]);
  return o;
}

/**
 * Get Server By Name.
 */
export async function GetOllamaServerByName(name: string): Promise<OllamaServer> {
  if (name === "GitHub") return getGitHubServer();
  throw new Error("Server not available");
}

/**
 * Add Server. (Unsupported in GitHub-only mode)
 */
export async function AddOllamaServers(name: string, server: OllamaServer): Promise<void> {
  throw new Error("Adding custom servers is not supported in GitHub-only mode");
}

/**
 * Edit Server. (Unsupported in GitHub-only mode)
 */
export async function EditOllamaServers(name: string, server: OllamaServer): Promise<void> {
  throw new Error("Editing servers is not supported in GitHub-only mode");
}

/**
 * Delete Server. (Unsupported in GitHub-only mode)
 */
export async function DeleteOllamaServers(name: string): Promise<void> {
  throw new Error("Deleting servers is not supported in GitHub-only mode");
}

/**
 * Get Settings for Command Answer from LocalStorage. (unchanged)
 */
export async function GetSettingsCommandAnswer(
  command: SettingsEnum.CommandAnswer
): Promise<Types.SettingsCommandAnswer> {
  const j = await LocalStorage.getItem(`settings_command_${command}`);
  if (j) return JSON.parse(j as string);
  throw new Error("Settings for this Command unavailable");
}

export async function SetSettingsCommandAnswer(
  command: SettingsEnum.CommandAnswer,
  settings: Types.SettingsCommandAnswer
): Promise<void> {
  await LocalStorage.setItem(`settings_command_${command}`, JSON.stringify(settings));
}

export async function GetSettingsCommandChatNames(): Promise<string[]> {
  const c = await GetSettingsCommandChat();
  if (c.length === 0) throw new Error("No Saved Chat");
  return c.map((v): string => v.name);
}

export async function GetSettingsCommandChatByIndex(i: number): Promise<Types.RaycastChat> {
  const c = await GetSettingsCommandChat();
  if (c[i]) return c[i];
  throw new Error("Chat on given index doesn't exist");
}

export async function SetSettingsCommandChatByIndex(i: number, chat: Types.RaycastChat): Promise<void> {
  const c = await GetSettingsCommandChat();
  if (!c[i]) throw new Error("Chat on given index doesn't exist");
  c[i] = chat;
  await SetSettingsCommandChat(c);
}

export async function AddSettingsCommandChat(chat: Types.RaycastChat): Promise<void> {
  const c = await GetSettingsCommandChat().catch((): Types.RaycastChat[] => {
    return [];
  });
  c.unshift(chat);
  await SetSettingsCommandChat(c);
}

export async function DeleteSettingsCommandChatByIndex(i: number): Promise<void> {
  let c = await GetSettingsCommandChat();
  c = c.filter((value, index) => index !== i);
  await SetSettingsCommandChat(c);
}

async function GetSettingsCommandChat(): Promise<Types.RaycastChat[]> {
  const j = await LocalStorage.getItem(`setting_command_chat`);
  if (j) return JSON.parse(j as string);
  const jl = await GetLegacySettingsCommandChat().catch(() => undefined);
  if (jl) return jl;
  throw new Error("No saved chat");
}

async function SetSettingsCommandChat(chat: Types.RaycastChat[]): Promise<void> {
  await LocalStorage.setItem(`setting_command_chat`, JSON.stringify(chat));
}

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
      const prefs = getPreferenceValues<Preferences>();
      return {
        name: v[0],
        models: {
          main: {
            server_name: "GitHub",
            server: {
              url: "https://models.github.ai",
              auth: prefs.githubToken
                ? { mode: OllamaServerAuthorizationMethod.BEARER, token: prefs.githubToken }
                : undefined,
            },
            tag: String(jm),
          },
          embedding: je
            ? {
                server_name: "GitHub",
                server: {
                  url: "https://models.github.ai",
                  auth: prefs.githubToken
                    ? { mode: OllamaServerAuthorizationMethod.BEARER, token: prefs.githubToken }
                    : undefined,
                },
                tag: String(je),
              }
            : undefined,
          vision: ji
            ? {
                server_name: "GitHub",
                server: {
                  url: "https://models.github.ai",
                  auth: prefs.githubToken
                    ? { mode: OllamaServerAuthorizationMethod.BEARER, token: prefs.githubToken }
                    : undefined,
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
