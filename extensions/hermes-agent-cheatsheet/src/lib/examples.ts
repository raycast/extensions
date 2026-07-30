import type { CheatsheetItem, CommandExample, ExtensionPreferences } from "../types";

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function personalizedModelCommand(
  command: string,
  preferences: Pick<ExtensionPreferences, "preferredModel" | "preferredProvider">,
): string | undefined {
  if (!command.startsWith("/model ") || command === "/model --refresh") return undefined;

  const model = preferences.preferredModel?.trim() ?? "";
  const provider = preferences.preferredProvider?.trim() ?? "";
  if (!model || !provider) return undefined;

  const withModel = command.replace(/^\/model\s+\S+/, `/model ${model}`);
  return withModel.includes("--provider")
    ? withModel.replace(/--provider\s+\S+/, `--provider ${provider}`)
    : `${withModel} --provider ${provider}`;
}

function personalizedExampleMetadata(command: string): Pick<CommandExample, "title" | "description"> {
  if (command.includes("--global")) {
    return {
      title: "Your Model — Global",
      description: "Uses your preferred model and provider, then saves them as the global default.",
    };
  }
  if (command.includes("--session")) {
    return {
      title: "Your Model — Session",
      description: "Uses your preferred model and provider for the current session.",
    };
  }
  if (command.includes("--once")) {
    return {
      title: "Your Model — One Turn",
      description: "Uses your preferred model and provider for one turn.",
    };
  }
  return {
    title: "Your Model and Provider",
    description: "Uses the preferred model and provider supplied in the extension preferences.",
  };
}

export function getExamples(
  item: CheatsheetItem,
  preferences?: Pick<ExtensionPreferences, "preferredModel" | "preferredProvider">,
): CommandExample[] {
  const examples = item.examples ?? [];
  if (!preferences) return examples;

  const personalized = examples.map((example) => {
    const command = personalizedModelCommand(example.command, preferences);
    return command ? { ...example, ...personalizedExampleMetadata(command), command } : example;
  });

  return personalized.filter(
    (example, index) => personalized.findIndex((candidate) => candidate.command === example.command) === index,
  );
}

export interface ModelPersonalizationState {
  needsPreferences: boolean;
  missingModel: boolean;
  missingProvider: boolean;
}

export function getModelPersonalizationState(
  examples: CommandExample[],
  preferences: Pick<ExtensionPreferences, "preferredModel" | "preferredProvider">,
): ModelPersonalizationState {
  const hasModelExample = examples.some(
    (example) => example.command.startsWith("/model ") && example.command !== "/model --refresh",
  );
  const missingModel = !preferences.preferredModel?.trim();
  const missingProvider = !preferences.preferredProvider?.trim();
  return {
    needsPreferences: hasModelExample && (missingModel || missingProvider),
    missingModel,
    missingProvider,
  };
}

function matchScore(example: CommandExample, searchText: string): number {
  const query = normalize(searchText);
  if (!query) return 0;

  const command = normalize(example.command);
  const title = normalize(example.title);
  const description = normalize(example.description ?? "");
  let score = 0;

  if (command.includes(query)) score += 12;
  if (title.includes(query)) score += 8;
  if (description.includes(query)) score += 4;

  for (const token of query.split(/\s+/).filter((value) => value.length > 1)) {
    if (command.includes(token)) score += 3;
    if (title.includes(token)) score += 2;
    if (description.includes(token)) score += 1;
  }

  return score;
}

export function getPrimaryExample(
  item: CheatsheetItem,
  searchText: string,
  preferences?: Pick<ExtensionPreferences, "preferredModel" | "preferredProvider">,
): CommandExample | undefined {
  const examples = getExamples(item, preferences);
  if (!examples.length) return undefined;

  const ranked = examples
    .map((example, index) => ({ example, index, score: matchScore(example, searchText) }))
    .sort((left, right) => right.score - left.score || left.index - right.index);

  return ranked[0]?.example;
}

export function getContextualExample(
  item: CheatsheetItem,
  contextCommand: string | undefined,
  searchText: string,
  preferences?: Pick<ExtensionPreferences, "preferredModel" | "preferredProvider">,
): CommandExample | undefined {
  const examples = getExamples(item, preferences);
  return (
    examples.find((example) => example.command === contextCommand) ?? getPrimaryExample(item, searchText, preferences)
  );
}

export interface PrimarySelection {
  content: string;
  example?: CommandExample;
  kind: "example" | "usage";
}

export function getPrimarySelection(
  item: CheatsheetItem,
  searchText: string,
  preferences: Pick<ExtensionPreferences, "preferredModel" | "preferredProvider" | "primaryContent">,
  contextCommand?: string,
): PrimarySelection {
  const example = getContextualExample(item, contextCommand, searchText, preferences);
  if (preferences.primaryContent === "example" && example) {
    return { content: example.command, example, kind: "example" };
  }
  return { content: item.usage, example, kind: "usage" };
}
