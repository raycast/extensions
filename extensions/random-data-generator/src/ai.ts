import _ from "lodash";

import type { CustomItem } from "@/customItems";
import type fakerClient from "@/faker";

const EXAMPLES: Array<{ description: string; answer: Omit<CustomItem, "id"> }> = [
  {
    description: "integer between 5 and 10",
    answer: { name: "Integer 5-10", template: '{{number.int({"min":5,"max":10})}}' },
  },
  {
    description: "full name with email",
    answer: { name: "Name and Email", template: "{{person.firstName}} {{person.lastName}} <{{internet.email}}>" },
  },
  {
    description: "one of red, green or blue",
    answer: { name: "Primary Color", template: '{{helpers.arrayElement(["red","green","blue"])}}' },
  },
  {
    description: "price between 10 and 100 with 2 decimals",
    answer: { name: "Price 10-100", template: '{{commerce.price({"min":10,"max":100,"dec":2})}}' },
  },
  {
    description: "a date within the last 30 days",
    answer: { name: "Recent Date", template: '{{date.recent({"days":30})}}' },
  },
];

/** Faker properties that are not generator modules. */
const HIDDEN_MODULES = new Set(["rawDefinitions", "definitions"]);

/** Helper methods that take callbacks, enums or other arguments a JSON template cannot express. */
const HIDDEN_METHODS = new Set([
  "helpers.fake",
  "helpers.mustache",
  "helpers.maybe",
  "helpers.multiple",
  "helpers.uniqueArray",
  "helpers.enumValue",
  "helpers.rangeToNumber",
]);

/**
 * Lists every `module.method` a template may call, straight from Faker so helpers such as
 * `helpers.arrayElement` are included even though the list view hides them.
 */
export function listTemplateMethods(faker: typeof fakerClient.faker): string[] {
  return _.flatMap(Object.keys(faker), (moduleName) => {
    if (moduleName.startsWith("_") || HIDDEN_MODULES.has(moduleName)) return [];
    const module = faker[moduleName as keyof typeof faker];
    if (!_.isObject(module)) return [];
    return Object.keys(module)
      .filter((methodName) => !methodName.startsWith("_") && _.isFunction(_.get(module, methodName)))
      .map((methodName) => `${moduleName}.${methodName}`)
      .filter((path) => !HIDDEN_METHODS.has(path));
  });
}

export function buildPrompt(description: string, availableMethods: string[], previousError?: string) {
  const examples = EXAMPLES.map(
    ({ description, answer }) => `Description: ${description}\nAnswer: ${JSON.stringify(answer)}`,
  ).join("\n\n");

  const retryNote = previousError ? `\n\nYour previous answer failed with this error, fix it:\n${previousError}` : "";

  return `You convert a plain-language description into a Faker.js (v10) template string.

Template syntax rules:
- A tag is {{module.method}} and is replaced by the result of calling faker.module.method().
- A tag may pass exactly one argument in parentheses: {{module.method(ARG)}}. ARG must be strict JSON (double-quoted keys and strings), for example {{number.int({"min":5,"max":10})}}, {{helpers.arrayElement(["a","b"])}}, {{string.alphanumeric(8)}}.
- Literal text may surround tags and several tags may be combined: "{{person.firstName}} {{person.lastName}} <{{internet.email}}>".
- Use only methods from the list below. Prefer a single tag when one method suffices.

Available methods (module.method):
${availableMethods.join(", ")}

Examples:
${examples}

Respond with only a JSON object of the shape {"name": "<short title>", "template": "<template>"}. No prose, no code fences.

Description: ${description}${retryNote}
Answer:`;
}

export const INVALID_AI_ANSWER = 'The answer was not a JSON object with a non-empty "template" string.';

/**
 * Extracts the `{"name", "template"}` object from the AI answer, tolerating code fences and prose around it.
 * Returns `undefined` when no such object with a non-empty template is present.
 */
export function parseAiAnswer(text: string): Omit<CustomItem, "id"> | undefined {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return undefined;

  try {
    const parsed = JSON.parse(match[0]);
    if (!parsed || typeof parsed.template !== "string" || !parsed.template.trim()) return undefined;
    return { name: typeof parsed.name === "string" ? parsed.name.trim() : "", template: parsed.template };
  } catch {
    return undefined;
  }
}
