import { ObsidianCliError, invoke } from "./obsidianCli";
import type { Vault } from "./vaults";

export type LinkItem = { text: string; path: string; alias?: string };
export type TagItem = { tag: string; count: number };

interface SuggestResponse<T> {
  ok: boolean;
  items?: T[];
  error?: string;
}

async function suggest<T>(vault: Vault, kind: "links" | "tags"): Promise<T[]> {
  let response: SuggestResponse<T>;
  try {
    response = await invoke<SuggestResponse<T>>(vault, "quickadd:suggest", {
      kind,
    });
  } catch (error) {
    if (
      error instanceof ObsidianCliError &&
      error.message.includes('Command "quickadd:suggest" not found')
    ) {
      throw new ObsidianCliError(
        "Link and tag completion needs QuickAdd 2.31 or later.",
      );
    }
    throw error;
  }
  if (!response.ok || !response.items) {
    throw new ObsidianCliError(
      response.error ?? "QuickAdd returned no suggestions.",
    );
  }
  return response.items;
}

export async function suggestLinks(vault: Vault): Promise<LinkItem[]> {
  return suggest<LinkItem>(vault, "links");
}

export async function suggestTags(vault: Vault): Promise<TagItem[]> {
  return suggest<TagItem>(vault, "tags");
}
