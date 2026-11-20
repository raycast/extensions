import { z } from "zod";
import { resolveBaseUrl } from "../baseUrl";
import { createLogger } from "../logger";
import { providerError } from "../providerError";
import { PART_OF_SPEECH_VALUES, REGISTER_VALUES, WordResponseJsonSchema, WordResponseSchema } from "../types";
import { postWithRetry, readApiResponse, stripCodeFences } from "./transport";
import type { JsonTransport, ProviderId } from "./types";

const log = createLogger("openai");

const ChatCompletionResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string().nullable().optional(),
        refusal: z.string().nullable().optional(),
      }),
      finish_reason: z.string().nullable().optional(),
    }),
  ),
});

type JsonSchemaNode = Record<string, unknown>;

function isNode(value: unknown): value is JsonSchemaNode {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function withoutPropertyOrdering(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(withoutPropertyOrdering);
  if (!isNode(node)) return node;
  const out: JsonSchemaNode = {};
  for (const [key, value] of Object.entries(node)) {
    if (key !== "propertyOrdering") out[key] = withoutPropertyOrdering(value);
  }
  return out;
}

function nullable(node: JsonSchemaNode): JsonSchemaNode {
  const { type } = node;
  if (typeof type !== "string" && !Array.isArray(type)) return { anyOf: [node, { type: "null" }] };
  const types = Array.isArray(type) ? type : [type];
  const out: JsonSchemaNode = { ...node, type: types.includes("null") ? types : [...types, "null"] };
  if (Array.isArray(node.enum) && !node.enum.includes(null)) out.enum = [...node.enum, null];
  return out;
}

/**
 * Strict mode requires every property to be listed in `required`, so optional
 * properties become required-but-nullable; `dropNulls` undoes that on the way
 * back. Expects `propertyOrdering` to be stripped already.
 */
function toStrictNode(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toStrictNode);
  if (!isNode(node)) return node;
  const out: JsonSchemaNode = {};
  for (const [key, value] of Object.entries(node)) {
    out[key] = key === "properties" ? value : toStrictNode(value);
  }
  if (isNode(node.properties)) {
    const required = new Set(Array.isArray(node.required) ? node.required : []);
    const properties: JsonSchemaNode = {};
    for (const [name, child] of Object.entries(node.properties)) {
      const strictChild = toStrictNode(child);
      properties[name] = required.has(name) || !isNode(strictChild) ? strictChild : nullable(strictChild);
    }
    out.properties = properties;
    out.required = Object.keys(properties);
    out.additionalProperties = false;
  }
  return out;
}

function toOpenAiStrictSchema(schema: JsonSchemaNode): JsonSchemaNode {
  return toStrictNode(withoutPropertyOrdering(schema)) as JsonSchemaNode;
}

function dropNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(dropNulls);
  if (!isNode(value)) return value;
  const out: JsonSchemaNode = {};
  for (const [key, child] of Object.entries(value)) {
    if (child !== null) out[key] = dropNulls(child);
  }
  return out;
}

/** Unparseable text is returned as is so the shared pipeline reports it as `invalid-response`. */
function normalizeAnswer(text: string): string {
  try {
    return JSON.stringify(dropNulls(JSON.parse(text)));
  } catch {
    return text;
  }
}

/**
 * Strict structured output is sent only to OpenAI itself. Compatible servers
 * implement strict mode unevenly (Gemini's compat layer rejects `null` inside
 * an `enum`), so they get the schema non-strict and as written. Likewise
 * `reasoning_effort`: an unknown server may reject the parameter.
 */
function responseFormat(provider: ProviderId, schema: JsonSchemaNode) {
  const strict = provider === "openai";
  return {
    type: "json_schema",
    json_schema: {
      name: "response",
      strict,
      schema: strict ? toOpenAiStrictSchema(schema) : withoutPropertyOrdering(schema),
    },
  };
}

/** Chat Completions transport for both "openai" and "openai-compatible". */
export const openAiJsonTransport: JsonTransport = async (config, req) => {
  const { provider } = config;
  const model = config.model.trim();
  const resolvedBaseUrl = resolveBaseUrl(config.baseUrl, provider, "translate");
  const totalMs = log.timer();
  const failure = (kind: "invalid-response" | "empty-response") =>
    providerError({ domain: "infrastructure", kind, surface: "translate", provider });

  const response = await postWithRetry({
    url: `${resolvedBaseUrl}/chat/completions`,
    headers: { Authorization: `Bearer ${config.apiKey}` },
    body: {
      model,
      messages: [{ role: "user", content: req.prompt }],
      response_format: responseFormat(provider, req.schema),
      ...(provider === "openai" && config.reasoningEffort ? { reasoning_effort: config.reasoningEffort } : {}),
    },
    signal: req.signal,
    context: { provider, surface: "translate", model, resolvedBaseUrl },
  });

  const apiData = await readApiResponse(response, ChatCompletionResponseSchema, {
    provider,
    surface: "translate",
    signal: req.signal,
  });
  const choice = apiData.choices[0];
  if (choice?.message.refusal) throw failure("invalid-response");
  if (choice?.finish_reason === "length") throw failure("invalid-response");
  const raw = choice?.message.content ?? "";
  if (!raw.trim()) throw failure("empty-response");

  log.debug("translation request completed", { provider, model, totalMs: totalMs(), responseChars: raw.length });
  return normalizeAnswer(stripCodeFences(raw));
};

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  function at(node: unknown, ...path: string[]): JsonSchemaNode {
    let current = node;
    for (const key of path) current = isNode(current) ? current[key] : undefined;
    if (!isNode(current)) throw new Error(`no schema node at ${path.join(".")}`);
    return current;
  }

  function objectNodes(node: unknown, found: JsonSchemaNode[] = []): JsonSchemaNode[] {
    if (Array.isArray(node)) node.forEach((child) => objectNodes(child, found));
    else if (isNode(node)) {
      if (isNode(node.properties)) found.push(node);
      Object.values(node).forEach((child) => objectNodes(child, found));
    }
    return found;
  }

  describe("toOpenAiStrictSchema", () => {
    const strict = toOpenAiStrictSchema(WordResponseJsonSchema);
    const senseProps = at(strict, "properties", "senses", "items", "properties");

    it("lists every property as required and closes every object", () => {
      const objects = objectNodes(strict);
      expect(objects).toHaveLength(2);
      for (const node of objects) {
        expect(node.required).toEqual(Object.keys(at(node, "properties")));
        expect(node.additionalProperties).toBe(false);
      }
    });

    it("makes originally optional properties nullable and leaves required ones alone", () => {
      expect(at(strict, "properties", "correctedWord").type).toEqual(["string", "null"]);
      expect(at(strict, "properties", "notAWord").type).toEqual(["boolean", "null"]);
      expect(at(senseProps, "transcription").type).toEqual(["string", "null"]);
      expect(at(senseProps, "forms").type).toEqual(["string", "null"]);
      expect(at(senseProps, "register").type).toEqual(["string", "null"]);
      expect(at(senseProps, "translation").type).toBe("string");
      expect(at(senseProps, "partOfSpeech").type).toBe("string");
      expect(at(strict, "properties", "senses").type).toBe("array");
    });

    it("adds null to the enum of a nullable property only", () => {
      expect(at(senseProps, "register").enum).toEqual([...REGISTER_VALUES, null]);
      expect(at(senseProps, "partOfSpeech").enum).toEqual([...PART_OF_SPEECH_VALUES]);
    });

    it("strips propertyOrdering everywhere and leaves the shared schema untouched", () => {
      expect(JSON.stringify(strict)).not.toContain("propertyOrdering");
      expect(WordResponseJsonSchema.properties.senses.items.required).toHaveLength(4);
      expect(WordResponseJsonSchema.properties.senses.items.properties.register.type).toBe("string");
    });

    it("keeps descriptions and array bounds", () => {
      expect(at(strict, "properties", "senses").maxItems).toBe(5);
      expect(at(senseProps, "translation").description).toBe(
        WordResponseJsonSchema.properties.senses.items.properties.translation.description,
      );
    });
  });

  describe("normalizeAnswer", () => {
    it("drops strict-mode null placeholders so the shared schema accepts the answer", () => {
      const strictAnswer = {
        senses: [
          {
            translation: "x",
            partOfSpeech: "noun",
            example: "e",
            exampleTranslation: "s",
            transcription: null,
            forms: null,
            register: null,
          },
        ],
        correctedWord: null,
        notAWord: null,
      };
      expect(WordResponseSchema.safeParse(strictAnswer).success).toBe(false);
      const normalized: unknown = JSON.parse(normalizeAnswer(JSON.stringify(strictAnswer)));
      expect(normalized).toEqual({
        senses: [{ translation: "x", partOfSpeech: "noun", example: "e", exampleTranslation: "s" }],
      });
      expect(WordResponseSchema.safeParse(normalized).success).toBe(true);
    });

    it("returns unparseable text unchanged", () => {
      expect(normalizeAnswer("not json")).toBe("not json");
    });
  });
}
