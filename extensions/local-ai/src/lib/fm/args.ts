export type Creativity = "normal" | "precise";
export type UseCase = "general" | "content-tagging";
export type Guardrails = "permissive" | "default";

export interface RespondOptions {
  model: string;
  instructions?: string;
  creativity: Creativity;
  useCase: UseCase;
  guardrails: Guardrails;
  stream: boolean;
  imagePaths?: string[];
}

const SYSTEM_MODEL = "system";
const PERMISSIVE_GUARDRAILS = "permissive-content-transformations";

export function buildRespondArgs(options: RespondOptions): string[] {
  const args = ["respond", `--model=${options.model}`];
  const instructions = options.instructions;
  if (instructions?.trim()) args.push(`--instructions=${instructions}`);
  if (options.model === SYSTEM_MODEL) {
    args.push("--use-case", options.useCase);
    args.push("--guardrails", options.guardrails === "permissive" ? PERMISSIVE_GUARDRAILS : "default");
  }
  if (options.creativity === "precise") args.push("--greedy");
  args.push(options.stream ? "--stream" : "--no-stream");
  return [...args, ...imageArgs(options.imagePaths)];
}

export function buildCountTokensArgs(options: { instructions?: string; imagePaths?: string[] }): string[] {
  const args = ["count-tokens", "--quiet"];
  const instructions = options.instructions;
  if (instructions?.trim()) args.push(`--instructions=${instructions}`);
  return [...args, ...imageArgs(options.imagePaths)];
}

function imageArgs(imagePaths: string[] | undefined): string[] {
  return (imagePaths ?? []).map((path) => `--image=${path}`);
}
