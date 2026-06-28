import { LocalStorage } from "@raycast/api";

export interface Prompt {
  id: string;
  title: string;
  prompt: string;
  category: string;
  description?: string;
  updatedAt: Date;
}

const STORAGE_KEY = "prompts";
const CATEGORIES_KEY = "categories";
const INITIALIZED_KEY = "initialized";

export async function getPrompts(): Promise<Prompt[]> {
  try {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (!stored) return [];

    const prompts = JSON.parse(stored) as Array<
      Omit<Prompt, "updatedAt"> & { updatedAt: string }
    >;
    return prompts.map((p) => ({
      ...p,
      updatedAt: new Date(p.updatedAt),
    }));
  } catch (error) {
    console.error("Failed to get prompts:", error);
    return [];
  }
}

export async function savePrompt(
  prompt: Omit<Prompt, "id" | "updatedAt">,
): Promise<Prompt> {
  const newPrompt: Prompt = {
    ...prompt,
    id: Math.random().toString(36).substring(2) + Date.now().toString(36),
    updatedAt: new Date(),
  };

  const prompts = await getPrompts();
  prompts.push(newPrompt);

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
  return newPrompt;
}

export async function updatePrompt(
  id: string,
  updates: Partial<Omit<Prompt, "id">>,
): Promise<Prompt | null> {
  const prompts = await getPrompts();
  const index = prompts.findIndex((p) => p.id === id);

  if (index === -1) return null;

  const existing = prompts[index]!;
  const updatedPrompt: Prompt = {
    id: existing.id,
    title: updates.title ?? existing.title,
    prompt: updates.prompt ?? existing.prompt,
    category: updates.category ?? existing.category,
    ...(updates.description !== undefined
      ? { description: updates.description }
      : existing.description
        ? { description: existing.description }
        : {}),
    updatedAt: new Date(),
  };

  prompts[index] = updatedPrompt;

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
  return updatedPrompt;
}

export async function deletePrompt(id: string): Promise<boolean> {
  const prompts = await getPrompts();
  const filtered = prompts.filter((p) => p.id !== id);

  if (filtered.length === prompts.length) return false;

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

export async function getPromptById(id: string): Promise<Prompt | null> {
  const prompts = await getPrompts();
  return prompts.find((p) => p.id === id) ?? null;
}

// Category management functions
export async function getCategories(): Promise<string[]> {
  try {
    const stored = await LocalStorage.getItem<string>(CATEGORIES_KEY);
    if (!stored) return ["General"];

    const categories = JSON.parse(stored) as string[];
    return categories.sort();
  } catch (error) {
    console.error("Failed to get categories:", error);
    return ["General"];
  }
}

export async function saveCategory(category: string): Promise<boolean> {
  if (!category.trim()) return false;

  const categories = await getCategories();
  const trimmedCategory = category.trim();

  if (categories.includes(trimmedCategory)) return false;

  categories.push(trimmedCategory);
  await LocalStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories.sort()));
  return true;
}

export async function deleteCategory(category: string): Promise<boolean> {
  if (category === "General") return false; // Don't allow deleting General

  const categories = await getCategories();
  const filtered = categories.filter((c) => c !== category);

  if (filtered.length === categories.length) return false;

  // Update prompts that use this category to "General"
  const prompts = await getPrompts();
  const updatedPrompts = prompts.map((p) =>
    p.category === category
      ? { ...p, category: "General", updatedAt: new Date() }
      : p,
  );

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPrompts));
  await LocalStorage.setItem(CATEGORIES_KEY, JSON.stringify(filtered.sort()));
  return true;
}

export async function updateCategory(
  oldName: string,
  newName: string,
): Promise<boolean> {
  if (oldName === "General" || !newName.trim()) return false;

  const categories = await getCategories();
  const trimmedNewName = newName.trim();

  if (categories.includes(trimmedNewName)) return false;

  const updated = categories.map((c) => (c === oldName ? trimmedNewName : c));

  // Update prompts that use this category
  const prompts = await getPrompts();
  const updatedPrompts = prompts.map((p) =>
    p.category === oldName
      ? { ...p, category: trimmedNewName, updatedAt: new Date() }
      : p,
  );

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPrompts));
  await LocalStorage.setItem(CATEGORIES_KEY, JSON.stringify(updated.sort()));
  return true;
}

// Default data for first-time users
const DEFAULT_CATEGORIES = [
  "Project Setup",
  "Git Operations",
  "Documentation",
  "Code Quality",
  "General",
];

const DEFAULT_PROMPTS: Omit<Prompt, "id" | "updatedAt">[] = [
  {
    title: "Create README",
    prompt:
      "Create a comprehensive README.md for this project including installation, usage, and contribution guidelines",
    category: "Project Setup",
    description: "Generate project documentation",
  },
  {
    title: "Add MIT License",
    prompt: "Add a standard MIT license file to this project",
    category: "Project Setup",
    description: "Add MIT license file",
  },
  {
    title: "Commit All Changes",
    prompt:
      "Review all changes and create a descriptive commit message, then commit all staged and unstaged changes",
    category: "Git Operations",
    description: "Smart commit with descriptive message",
  },
  {
    title: "Create .gitignore",
    prompt:
      "Create an appropriate .gitignore file for this project based on the technology stack",
    category: "Project Setup",
    description: "Generate technology-appropriate .gitignore",
  },
  {
    title: "Add Documentation",
    prompt:
      "Add comprehensive documentation comments to the selected code or current file",
    category: "Documentation",
    description: "Generate code comments and docs",
  },
  {
    title: "Create Changelog",
    prompt:
      "Create a CHANGELOG.md file with a list of changes and version numbers",
    category: "Documentation",
    description: "Create CHANGELOG.md",
  },
  {
    title: "Update Changelog",
    prompt:
      "Update the CHANGELOG.md file with the latest changes and version number",
    category: "Documentation",
    description: "Update CHANGELOG.md",
  },
  {
    title: "Fix Linting Issues",
    prompt:
      "Identify and fix all linting/formatting issues in the current file or project",
    category: "Code Quality",
    description: "Auto-fix common lint problems",
  },
  {
    title: "Write Tests",
    prompt:
      "Generate comprehensive test files for the current code following best practices",
    category: "Code Quality",
    description: "Generate test files for code",
  },
  {
    title: "Explain Code",
    prompt:
      "Provide a clear explanation of what the selected code does and how it works",
    category: "General",
    description: "Explain selected code functionality",
  },
  {
    title: "Optimize Performance",
    prompt: "Analyze the code for performance issues and suggest optimizations",
    category: "Code Quality",
    description: "Suggest performance improvements",
  },
];

// Initialize defaults for first-time users
export async function initializeDefaults(): Promise<void> {
  try {
    const isInitialized = await LocalStorage.getItem<string>(INITIALIZED_KEY);
    if (isInitialized) return;

    // Set up default categories
    await LocalStorage.setItem(
      CATEGORIES_KEY,
      JSON.stringify(DEFAULT_CATEGORIES),
    );

    // Set up default prompts
    const defaultPrompts: Prompt[] = DEFAULT_PROMPTS.map((prompt) => ({
      ...prompt,
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      updatedAt: new Date(),
    }));

    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPrompts));
    await LocalStorage.setItem(INITIALIZED_KEY, "true");
  } catch (error) {
    console.error("Failed to initialize defaults:", error);
  }
}
