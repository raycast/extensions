import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "./utils/utils";
import { Tag, Rule } from "./types";
import * as fs from "fs/promises";
import * as path from "path";
import { ensureStorageDirectoryExists } from "./utils/storage-utils";
import { fetchRulesFromStorage, saveRulesToStorage } from "./rule-storage";

interface Preferences {
  storageDirectory: string;
}

export const getTagsFilePath = (): string => {
  const preferences = getPreferenceValues<Preferences>();
  const storageDirectory = preferences.storageDirectory;
  const expandedStorageDirectory = storageDirectory.replace(/^~/, process.env.HOME || "");
  return path.join(expandedStorageDirectory, "tags.json");
};

export async function fetchTagsFromStorage(): Promise<Tag[]> {
  const tagsFilePath = getTagsFilePath();
  try {
    await ensureStorageDirectoryExists();
    const tagsJson = await fs.readFile(tagsFilePath, "utf-8");
    const tags: Tag[] = tagsJson ? JSON.parse(tagsJson) : [];
    return tags;
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw error;
    }
    showFailureToast("Failed to load tags.", error);
    return [];
  }
}

export async function saveTagsToStorage(tags: Tag[]): Promise<void> {
  const tagsFilePath = getTagsFilePath();
  try {
    await ensureStorageDirectoryExists();
    await fs.writeFile(tagsFilePath, JSON.stringify(tags, null, 2), "utf-8");
  } catch (error) {
    showFailureToast("Failed to save tags.", error);
    throw error;
  }
}

export async function addTagToStorage(tagName: string): Promise<Tag | undefined> {
  try {
    const tags = await fetchTagsFromStorage();
    if (tags.some((tag) => tag.name === tagName.trim())) {
      showFailureToast("Tag Already Exists", `A tag with the name "${tagName.trim()}" already exists.`);
      return undefined;
    }
    const newTag = { name: tagName.trim() };
    const updatedTags = [...tags, newTag];
    await saveTagsToStorage(updatedTags);
    return newTag;
  } catch (error) {
    showFailureToast("Failed to add tag.", error);
    throw error;
  }
}

export async function deleteTagFromStorage(tagToDelete: Tag): Promise<Tag[]> {
  try {
    const tags = await fetchTagsFromStorage();
    const updatedTags = tags.filter((tag) => tag.name !== tagToDelete.name);
    await saveTagsToStorage(updatedTags);

    const rules = await fetchRulesFromStorage();
    const updatedRules = rules.map((rule: Rule) => {
      if (rule.tags && rule.tags.includes(tagToDelete.name)) {
        return {
          ...rule,
          tags: rule.tags.filter((tag: string) => tag !== tagToDelete.name),
        };
      }
      return rule;
    });
    await saveRulesToStorage(updatedRules);

    return updatedTags;
  } catch (error) {
    showFailureToast("Failed to delete tag.", error);
    throw error;
  }
}

export async function updateTagInStorage(originalTagName: string, updatedTag: Tag): Promise<Tag | undefined> {
  try {
    const tags = await fetchTagsFromStorage();
    if (tags.some((tag) => tag.name === updatedTag.name && tag.name !== originalTagName)) {
      showFailureToast("Tag Already Exists", `A tag with the name "${updatedTag.name}" already exists.`);
      return undefined;
    }
    let foundTag: Tag | undefined;
    const updatedTags = tags.map((tag) => {
      if (tag.name === originalTagName) {
        foundTag = updatedTag;
        return updatedTag;
      }
      return tag;
    });
    await saveTagsToStorage(updatedTags);

    const rules = await fetchRulesFromStorage();
    const updatedRules = rules.map((rule: Rule) => {
      if (rule.tags && rule.tags.includes(originalTagName)) {
        return {
          ...rule,
          tags: rule.tags.map((tag: string) => (tag === originalTagName ? updatedTag.name : tag)),
        };
      }
      return rule;
    });
    await saveRulesToStorage(updatedRules);

    return foundTag;
  } catch (error) {
    showFailureToast("Failed to update tag.", error);
    throw error;
  }
}

export async function restoreDefaultTagsInStorage(): Promise<{ tags: Tag[]; restored: boolean }> {
  let existingTags: Tag[] = [];
  let restored = false;

  try {
    existingTags = await fetchTagsFromStorage();
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code !== "ENOENT") {
      showFailureToast("Failed to fetch existing tags.", error);
      throw error;
    }
  }

  const defaultTags: Tag[] = [
    { name: "JavaScript" },
    { name: "Python" },
    { name: "Java" },
    { name: "C#" },
    { name: "C++" },
    { name: "TypeScript" },
    { name: "PHP" },
    { name: "Swift" },
    { name: "Go" },
    { name: "Rust" },
  ];

  const tagsToAdd = defaultTags.filter(
    (defaultTag) => !existingTags.some((existingTag) => existingTag.name === defaultTag.name),
  );

  if (tagsToAdd.length > 0) {
    const updatedTags = [...existingTags, ...tagsToAdd];
    await saveTagsToStorage(updatedTags);
    restored = true;
    return { tags: updatedTags, restored };
  } else {
    return { tags: existingTags, restored };
  }
}
