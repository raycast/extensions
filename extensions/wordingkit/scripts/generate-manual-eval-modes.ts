import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LANGUAGE_PRESETS } from "../src/tones.ts";
import type { EditingMode } from "../src/modes.ts";

type ManualMode = Omit<EditingMode, "lastUsedAt">;
type SourceMode = {
  id: string;
  title: string;
  subtitle: string;
};

const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_MAX_TOKENS = 4096;

export function validateManualModels(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("models.json must be an array of Ollama model names.");
  }

  const models = value.map((model, index) => {
    if (typeof model !== "string" || !model.trim()) {
      throw new Error(`models.json[${index}] must be a non-empty string.`);
    }
    return model.trim();
  });
  return [...new Set(models)];
}

function modelIdPart(model: string): string {
  return model
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildManualEvalModes(
  sourceModes: readonly SourceMode[],
  prompts: Record<string, string>,
  models: readonly string[],
): ManualMode[] {
  return models.flatMap((model) =>
    sourceModes.map(({ id, title }) => {
      const systemPrompt = prompts[id];
      if (!systemPrompt) {
        throw new Error(`Missing prompt for mode "${id}".`);
      }

      return {
        id: `${id}__${modelIdPart(model)}`,
        title: `${title} / ${model}`,
        provider: "ollama",
        model,
        systemPrompt,
        temperature: DEFAULT_TEMPERATURE,
        maxTokens: DEFAULT_MAX_TOKENS,
      };
    }),
  );
}

async function readJsonFile(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function generateManualEvalModes(
  projectRoot: string,
): Promise<string> {
  const inputDir = path.join(projectRoot, "manual-eval");
  const models = validateManualModels(
    await readJsonFile(path.join(inputDir, "models.json")),
  );
  const preset = LANGUAGE_PRESETS.ru;
  const modes = buildManualEvalModes(preset.styles, preset.prompts, models);
  const outputPath = path.join(inputDir, "modes.json");

  await writeFile(outputPath, `${JSON.stringify(modes, null, 2)}\n`, "utf8");
  return `Generated ${modes.length} modes: ${outputPath}`;
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (currentFile === invokedFile) {
  generateManualEvalModes(path.resolve(path.dirname(currentFile), ".."))
    .then((message) => console.log(message))
    .catch((reason) => {
      console.error(reason instanceof Error ? reason.message : String(reason));
      process.exitCode = 1;
    });
}
