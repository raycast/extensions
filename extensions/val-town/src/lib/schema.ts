import { AI, environment } from "@raycast/api";
import { listFiles, readFile } from "./api";
import type { JsonSchema } from "./store";
import type { FileType, ValFile } from "./types";

export function canIntrospect(): boolean {
  return environment.canAccess(AI);
}

const PROMPT = `You are reading the source of a Val Town HTTP handler.

Return a JSON Schema describing the JSON request body this handler reads — query parameters count too.
Rules:
- Output JSON only. No prose, no code fence.
- Shape: {"type":"object","properties":{...},"required":[...]}
- Give every property a "type" and a short "description".
- If the handler reads nothing off the request, return {"type":"object","properties":{}}.

Source:
`;

/** A plain `file` is data; `run_file` refuses it. */
export const RUNNABLE_TYPES: FileType[] = ["http", "script", "interval", "email"];

/**
 * Which file a val is called at when its config does not say. An http file wins because it can take
 * arguments; `main.*` wins among those because that is the convention. Undefined means the val has
 * nothing callable at all.
 */
export function pickEntrypoint(files: ValFile[]): ValFile | undefined {
  return pickHttpFile(files) ?? files.find((file) => RUNNABLE_TYPES.includes(file.type));
}

/**
 * The model reads the code because that is where the interface is; a README rarely repeats it.
 * A given `entrypoint` is honoured; otherwise the file is resolved and reported back through `path`
 * so the caller can fill the field. A null schema means the file takes nothing: a non-http file has
 * no request body, and neither does a val with nothing callable — answers, not failures.
 */
export async function introspect(
  val: string,
  entrypoint?: string,
  signal?: AbortSignal,
): Promise<{ schema: JsonSchema | null; path: string } | null> {
  const { files } = await listFiles(val, {}, signal);
  const entry = entrypoint ? files.find((file) => file.path === entrypoint) : pickEntrypoint(files);
  if (entrypoint && !entry) throw new Error(`${val} has no file at ${entrypoint}.`);
  if (!entry) return null;
  if (entry.type !== "http") return { schema: null, path: entry.path };

  const { content } = await readFile(val, entry.path, {}, signal);
  const answer = await AI.ask(`${PROMPT}${content.slice(0, 24000)}`, { creativity: 0 });

  return { schema: parseSchema(answer), path: entry.path };
}

function pickHttpFile(files: ValFile[]): ValFile | undefined {
  const httpFiles = files.filter((file) => file.type === "http");
  return httpFiles.find((file) => /^main\./.test(file.name)) ?? httpFiles[0];
}

/** Models fence their JSON often enough that stripping it is cheaper than re-asking. */
function parseSchema(answer: string): JsonSchema {
  const fenced = /```(?:json)?\s*\n([\s\S]*?)```/i.exec(answer);
  const body = (fenced ? fenced[1] : answer).trim();

  const parsed = JSON.parse(body) as JsonSchema;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
  return { type: "object", properties: {}, ...parsed };
}
