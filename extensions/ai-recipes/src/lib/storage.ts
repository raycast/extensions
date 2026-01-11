import { LocalStorage } from "@raycast/api";
import { nanoid } from "nanoid";
import { Recipe, Tag, UsageRecord, TagColor } from "../types";
import { AI } from "@raycast/api";

const RECIPES_KEY = "ai_recipes";
const TAGS_KEY = "ai_recipe_tags";
const USAGE_RECORDS_KEY = "ai_recipe_usage_records";

// Model migration map for old format model names
const MODEL_MIGRATION_MAP: Record<string, AI.Model> = {
  "anthropic-claude-sonnet": AI.Model.OpenAI_GPT4o,
  "anthropic-claude-haiku": AI.Model.OpenAI_GPT4o,
  "anthropic-claude-4-sonnet": AI.Model.OpenAI_GPT4o,
  "anthropic-claude-4-opus": AI.Model.OpenAI_GPT4o,
  "anthropic-claude-sonnet-4": AI.Model.OpenAI_GPT4o,
  "anthropic-claude-sonnet-4-5": AI.Model.OpenAI_GPT4o,
  Anthropic_Claude_Sonnet: AI.Model.OpenAI_GPT4o,
  Anthropic_Claude_Haiku: AI.Model.OpenAI_GPT4o,
  Anthropic_Claude_4_Sonnet: AI.Model.OpenAI_GPT4o,
  Anthropic_Claude_4_Opus: AI.Model.OpenAI_GPT4o,
  "Anthropic_Claude_4.5_Sonnet": AI.Model.OpenAI_GPT4o,
  "openai-gpt-4o": AI.Model.OpenAI_GPT4o,
  "openai-gpt-4o-mini": AI.Model["OpenAI_GPT4o-mini"],
  "openai-gpt-4.1": AI.Model["OpenAI_GPT4.1"],
  "openai-gpt-4.1-mini": AI.Model["OpenAI_GPT4.1-mini"],
  "google-gemini-2.5-pro": AI.Model["Google_Gemini_2.5_Pro"],
  "google-gemini-2.5-flash": AI.Model["Google_Gemini_2.5_Flash"],
  "llama3.3-70b": AI.Model["Llama3.3_70B"],
  "groq-llama-3.3-70b-versatile": AI.Model["Llama3.3_70B"],
  "deepseek-r1": AI.Model.DeepSeek_R1,
  "deepseek-v3": AI.Model.DeepSeek_V3,
  "together-deepseek-ai/DeepSeek-R1": AI.Model.DeepSeek_R1,
};

function migrateModelName(model: string): AI.Model {
  return (MODEL_MIGRATION_MAP[model] || model) as AI.Model;
}

// ============ Recipe Storage ============

export async function getRecipes(): Promise<Recipe[]> {
  const data = await LocalStorage.getItem<string>(RECIPES_KEY);
  if (!data) return [];
  try {
    const recipes = JSON.parse(data) as Recipe[];
    let needsSave = false;
    const migratedRecipes = recipes.map((recipe) => {
      const migratedModel = migrateModelName(recipe.defaultModel as string);
      if (migratedModel !== recipe.defaultModel) {
        needsSave = true;
        return { ...recipe, defaultModel: migratedModel };
      }
      return recipe;
    });
    if (needsSave) {
      await LocalStorage.setItem(RECIPES_KEY, JSON.stringify(migratedRecipes));
    }
    return migratedRecipes;
  } catch {
    return [];
  }
}

export async function getRecipe(id: string): Promise<Recipe | undefined> {
  const recipes = await getRecipes();
  return recipes.find((r) => r.id === id);
}

export async function createRecipe(
  recipe: Omit<Recipe, "id" | "createdAt" | "updatedAt" | "usageCount" | "promptVersions">
): Promise<Recipe> {
  const recipes = await getRecipes();
  const now = Date.now();
  const newRecipe: Recipe = {
    ...recipe,
    id: nanoid(),
    createdAt: now,
    updatedAt: now,
    usageCount: 0,
    promptVersions: [
      {
        id: nanoid(),
        prompt: recipe.systemPrompt,
        createdAt: now,
        note: "Initial version",
      },
    ],
  };
  recipes.push(newRecipe);
  await LocalStorage.setItem(RECIPES_KEY, JSON.stringify(recipes));
  return newRecipe;
}

export async function updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe | undefined> {
  const recipes = await getRecipes();
  const index = recipes.findIndex((r) => r.id === id);
  if (index === -1) return undefined;

  const existingRecipe = recipes[index];
  const now = Date.now();

  let promptVersions = existingRecipe.promptVersions;
  if (updates.systemPrompt && updates.systemPrompt !== existingRecipe.systemPrompt) {
    promptVersions = [
      ...promptVersions,
      {
        id: nanoid(),
        prompt: updates.systemPrompt,
        createdAt: now,
      },
    ];
  }

  const updatedRecipe: Recipe = {
    ...existingRecipe,
    ...updates,
    promptVersions,
    updatedAt: now,
  };

  recipes[index] = updatedRecipe;
  await LocalStorage.setItem(RECIPES_KEY, JSON.stringify(recipes));
  return updatedRecipe;
}

export async function deleteRecipe(id: string): Promise<boolean> {
  const recipes = await getRecipes();
  const filtered = recipes.filter((r) => r.id !== id);
  if (filtered.length === recipes.length) return false;
  await LocalStorage.setItem(RECIPES_KEY, JSON.stringify(filtered));
  return true;
}

export async function incrementRecipeUsage(id: string): Promise<void> {
  const recipes = await getRecipes();
  const index = recipes.findIndex((r) => r.id === id);
  if (index === -1) return;

  recipes[index] = {
    ...recipes[index],
    usageCount: recipes[index].usageCount + 1,
    lastUsedAt: Date.now(),
  };

  await LocalStorage.setItem(RECIPES_KEY, JSON.stringify(recipes));
}

export async function duplicateRecipe(id: string): Promise<Recipe | undefined> {
  const recipe = await getRecipe(id);
  if (!recipe) return undefined;

  return createRecipe({
    name: `${recipe.name} (Copy)`,
    description: recipe.description,
    systemPrompt: recipe.systemPrompt,
    defaultModel: recipe.defaultModel,
    creativity: recipe.creativity,
    tagIds: recipe.tagIds,
    inputType: recipe.inputType,
    outputType: recipe.outputType,
  });
}

export async function revertToPromptVersion(recipeId: string, versionId: string): Promise<Recipe | undefined> {
  const recipe = await getRecipe(recipeId);
  if (!recipe) return undefined;

  const version = recipe.promptVersions.find((v) => v.id === versionId);
  if (!version) return undefined;

  return updateRecipe(recipeId, { systemPrompt: version.prompt });
}

// ============ Tag Storage ============

export async function getTags(): Promise<Tag[]> {
  const data = await LocalStorage.getItem<string>(TAGS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as Tag[];
  } catch {
    return [];
  }
}

export async function getTag(id: string): Promise<Tag | undefined> {
  const tags = await getTags();
  return tags.find((t) => t.id === id);
}

export async function createTag(name: string, color: TagColor): Promise<Tag> {
  const tags = await getTags();
  const newTag: Tag = {
    id: nanoid(),
    name,
    color,
    createdAt: Date.now(),
  };
  tags.push(newTag);
  await LocalStorage.setItem(TAGS_KEY, JSON.stringify(tags));
  return newTag;
}

export async function updateTag(id: string, updates: Partial<Omit<Tag, "id" | "createdAt">>): Promise<Tag | undefined> {
  const tags = await getTags();
  const index = tags.findIndex((t) => t.id === id);
  if (index === -1) return undefined;

  const updatedTag: Tag = {
    ...tags[index],
    ...updates,
  };

  tags[index] = updatedTag;
  await LocalStorage.setItem(TAGS_KEY, JSON.stringify(tags));
  return updatedTag;
}

export async function deleteTag(id: string): Promise<boolean> {
  const tags = await getTags();
  const filtered = tags.filter((t) => t.id !== id);
  if (filtered.length === tags.length) return false;
  await LocalStorage.setItem(TAGS_KEY, JSON.stringify(filtered));

  const recipes = await getRecipes();
  const updatedRecipes = recipes.map((recipe) => ({
    ...recipe,
    tagIds: recipe.tagIds.filter((tagId) => tagId !== id),
  }));
  await LocalStorage.setItem(RECIPES_KEY, JSON.stringify(updatedRecipes));

  return true;
}

// ============ Usage Record Storage ============

export async function getUsageRecords(recipeId?: string): Promise<UsageRecord[]> {
  const data = await LocalStorage.getItem<string>(USAGE_RECORDS_KEY);
  if (!data) return [];
  try {
    const records = JSON.parse(data) as UsageRecord[];
    if (recipeId) {
      return records.filter((r) => r.recipeId === recipeId);
    }
    return records;
  } catch {
    return [];
  }
}

export async function addUsageRecord(record: Omit<UsageRecord, "id" | "createdAt">): Promise<UsageRecord> {
  const records = await getUsageRecords();
  const newRecord: UsageRecord = {
    ...record,
    id: nanoid(),
    createdAt: Date.now(),
  };

  const updatedRecords = [newRecord, ...records].slice(0, 100);
  await LocalStorage.setItem(USAGE_RECORDS_KEY, JSON.stringify(updatedRecords));

  await incrementRecipeUsage(record.recipeId);

  return newRecord;
}

export async function deleteUsageRecord(id: string): Promise<boolean> {
  const records = await getUsageRecords();
  const filtered = records.filter((r) => r.id !== id);
  if (filtered.length === records.length) return false;
  await LocalStorage.setItem(USAGE_RECORDS_KEY, JSON.stringify(filtered));
  return true;
}

export async function clearUsageRecords(recipeId?: string): Promise<void> {
  if (recipeId) {
    const records = await getUsageRecords();
    const filtered = records.filter((r) => r.recipeId !== recipeId);
    await LocalStorage.setItem(USAGE_RECORDS_KEY, JSON.stringify(filtered));
  } else {
    await LocalStorage.removeItem(USAGE_RECORDS_KEY);
  }
}

// ============ Initialize Default Data ============

export async function initializeDefaultData(): Promise<void> {
  const tags = await getTags();
  const recipes = await getRecipes();

  if (tags.length === 0) {
    await createTag("Social Media", "blue");
    await createTag("Writing", "purple");
    await createTag("Coding", "green");
    await createTag("Translation", "orange");
    await createTag("Summary", "yellow");
  }

  if (recipes.length === 0) {
    const allTags = await getTags();
    const socialMediaTag = allTags.find((t) => t.name === "Social Media");
    const writingTag = allTags.find((t) => t.name === "Writing");

    await createRecipe({
      name: "Tweet Generator",
      description: "Convert your ideas into engaging tweets",
      systemPrompt: `You are a professional social media content creator. Convert the user's ideas or content into an engaging tweet.

Requirements:
- Keep it concise, under 280 characters
- Use vivid and interesting language
- Add appropriate emojis for expressiveness
- If suitable, include 1-2 relevant hashtags

Output the tweet directly, without any explanation or preamble.`,
      defaultModel: AI.Model.OpenAI_GPT4o,
      creativity: "high",
      tagIds: [socialMediaTag?.id, writingTag?.id].filter(Boolean) as string[],
      inputType: "Idea/Content",
      outputType: "Tweet",
    });
  }
}
