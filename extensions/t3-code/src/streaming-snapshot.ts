import { Readable } from "stream";
import { parser } from "stream-json";
import { OrchestrationProject, OrchestrationThread } from "./types";

const PROJECT_SKIP_FIELDS = new Set(["scripts"]);
const THREAD_SHELL_SKIP_FIELDS = new Set([
  "messages",
  "activities",
  "checkpoints",
  "proposedPlans",
]);
const DEFAULT_STRING_LIMIT = 20_000;
// Yield to the macrotask queue every this many tokens so parsing a large
// snapshot never starves Raycast's UI and navigation events.
const TOKENS_PER_YIELD = 4_096;

type JsonObject = Record<string, unknown>;
type Token = { name: string; value?: unknown };

export interface StreamedSnapshotProjection {
  projects: OrchestrationProject[];
  threads: OrchestrationThread[];
}

export async function streamSnapshotProjection(
  body: ReadableStream<Uint8Array> | null,
): Promise<StreamedSnapshotProjection> {
  const reader = createTokenReader(body);
  const projects: OrchestrationProject[] = [];
  const threads: OrchestrationThread[] = [];

  try {
    await parseRootObject(reader, {
      projects: async (token) => {
        await parseArrayItems(reader, token, async (itemToken) => {
          const project = (await parseObject(reader, itemToken, {
            skipFields: PROJECT_SKIP_FIELDS,
          })) as unknown as OrchestrationProject;
          projects.push({ ...project, scripts: project.scripts ?? [] });
        });
      },
      threads: async (token) => {
        await parseArrayItems(reader, token, async (itemToken) => {
          const thread = (await parseObject(reader, itemToken, {
            skipFields: THREAD_SHELL_SKIP_FIELDS,
          })) as unknown as OrchestrationThread;
          threads.push({
            ...thread,
            messages: thread.messages ?? [],
            activities: thread.activities ?? [],
            checkpoints: thread.checkpoints ?? [],
          });
        });
      },
    });
  } finally {
    reader.destroy();
  }

  return { projects, threads };
}

class TokenReader {
  private readonly iterator: AsyncIterator<Token>;
  private tokensSinceYield = 0;

  constructor(private readonly stream: Readable) {
    this.iterator = stream[Symbol.asyncIterator]() as AsyncIterator<Token>;
  }

  async next(): Promise<Token> {
    this.tokensSinceYield += 1;
    if (this.tokensSinceYield >= TOKENS_PER_YIELD) {
      this.tokensSinceYield = 0;
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    const result = await this.iterator.next();
    if (result.done) throw new Error("Unexpected end of JSON");
    return result.value;
  }

  destroy(): void {
    this.stream.destroy();
  }
}

function createTokenReader(
  body: ReadableStream<Uint8Array> | null,
): TokenReader {
  if (!body) throw new Error("Response body is empty");
  const source = Readable.fromWeb(body);
  const tokenStream = source.pipe(
    parser.asStream({
      packKeys: true,
      packStrings: false,
      packNumbers: false,
    }),
  );
  // pipe() does not forward errors from source to tokenStream. Without this,
  // a terminated connection emits an unhandled EventEmitter error that crashes
  // the process instead of propagating through the async iterator.
  source.on("error", (err) => tokenStream.destroy(err));
  return new TokenReader(tokenStream);
}

async function parseRootObject(
  reader: TokenReader,
  handlers: Record<string, (token: Token) => Promise<void>>,
): Promise<void> {
  await expectToken(await reader.next(), "startObject");
  while (true) {
    const token = await reader.next();
    if (token.name === "endObject") return;
    const key = await readKey(reader, token);
    const valueToken = await reader.next();
    const handler = handlers[key];
    if (handler) {
      await handler(valueToken);
    } else {
      await skipValue(reader, valueToken);
    }
  }
}

async function parseArrayItems(
  reader: TokenReader,
  startToken: Token,
  onItem: (token: Token) => Promise<void>,
): Promise<void> {
  await expectToken(startToken, "startArray");
  while (true) {
    const token = await reader.next();
    if (token.name === "endArray") return;
    await onItem(token);
  }
}

async function parseObject(
  reader: TokenReader,
  startToken: Token,
  options: {
    skipFields?: Set<string>;
  } = {},
): Promise<JsonObject> {
  await expectToken(startToken, "startObject");
  const object: JsonObject = {};

  while (true) {
    const token = await reader.next();
    if (token.name === "endObject") return object;
    const key = await readKey(reader, token);
    const valueToken = await reader.next();
    if (options.skipFields?.has(key)) {
      await skipValue(reader, valueToken);
      continue;
    }
    object[key] = await parseValue(reader, valueToken);
  }
}

async function parseValue(
  reader: TokenReader,
  token: Token,
  stringLimit = DEFAULT_STRING_LIMIT,
): Promise<unknown> {
  switch (token.name) {
    case "startObject":
      return parseObject(reader, token);
    case "startArray":
      return parseArray(reader, token);
    case "startString":
      return parseString(reader, stringLimit);
    case "startNumber":
      return parseNumber(reader);
    case "trueValue":
      return true;
    case "falseValue":
      return false;
    case "nullValue":
      return null;
    default:
      throw new Error(`Unexpected JSON token: ${token.name}`);
  }
}

async function parseArray(
  reader: TokenReader,
  startToken: Token,
): Promise<unknown[]> {
  const values: unknown[] = [];
  await parseArrayItems(reader, startToken, async (itemToken) => {
    values.push(await parseValue(reader, itemToken));
  });
  return values;
}

async function parseString(
  reader: TokenReader,
  limit: number,
): Promise<string> {
  let value = "";
  let truncated = false;
  while (true) {
    const token = await reader.next();
    if (token.name === "endString") {
      return truncated ? `${value}\n\n[Truncated in Raycast]` : value;
    }
    if (token.name !== "stringChunk") continue;
    const chunk = String(token.value ?? "");
    const remaining = limit - value.length;
    if (remaining > 0) value += chunk.slice(0, remaining);
    if (chunk.length > remaining) truncated = true;
  }
}

async function parseNumber(reader: TokenReader): Promise<number> {
  let raw = "";
  while (true) {
    const token = await reader.next();
    if (token.name === "endNumber") return Number(raw);
    if (token.name === "numberChunk") raw += String(token.value ?? "");
  }
}

async function readKey(
  reader: TokenReader,
  startToken: Token,
): Promise<string> {
  await expectToken(startToken, "startKey");
  while (true) {
    const token = await reader.next();
    if (token.name === "keyValue") return String(token.value);
  }
}

async function skipValue(reader: TokenReader, token: Token): Promise<void> {
  if (token.name === "startString") {
    await skipUntil(reader, "endString");
    return;
  }
  if (token.name === "startNumber") {
    await skipUntil(reader, "endNumber");
    return;
  }
  if (token.name !== "startObject" && token.name !== "startArray") return;

  let depth = 1;
  while (depth > 0) {
    const next = await reader.next();
    if (next.name === "startObject" || next.name === "startArray") depth += 1;
    if (next.name === "endObject" || next.name === "endArray") depth -= 1;
    if (next.name === "startString") await skipUntil(reader, "endString");
    if (next.name === "startNumber") await skipUntil(reader, "endNumber");
  }
}

async function skipUntil(reader: TokenReader, endToken: string): Promise<void> {
  while (true) {
    const token = await reader.next();
    if (token.name === endToken) return;
  }
}

async function expectToken(token: Token, name: string): Promise<void> {
  if (token.name !== name) {
    throw new Error(`Invalid JSON: expected ${name}, got ${token.name}`);
  }
}
