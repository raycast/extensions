import {
  fieldValueAsString,
  type CardTemplate,
  type FieldValue,
  type FieldValues,
  type TemplateInputField,
} from "./template";
import { parseTemplate } from "./template-parser";
import { assertValidTemplate } from "./template-validation";

export interface AiClient {
  ask(prompt: string, signal?: AbortSignal): Promise<string>;
}

export type PreparedTextSegment = {
  readonly kind: "text";
  readonly content: string;
};

export type PreparedAiSegment = {
  readonly kind: "ai";
  readonly id: string;
  readonly prompt: string;
};

export type PreparedSegment = PreparedTextSegment | PreparedAiSegment;

const PLACEHOLDER_PATTERN = /<<([^<>]+)>>/g;

export function prepareTemplate(template: CardTemplate, values: FieldValues): readonly PreparedSegment[] {
  assertValidTemplate(template);

  return prepareContent(template.cardBody, template.fields, values);
}

export function prepareContent(
  content: string,
  fields: readonly TemplateInputField[],
  values: FieldValues,
  aiIdPrefix = ""
): readonly PreparedSegment[] {
  const valuesByName = Object.fromEntries(fields.map((field) => [field.name, values[field.id]]));
  return parseTemplate(content).map((segment) => {
    switch (segment.kind) {
      case "text":
        return { kind: "text", content: substituteFields(segment.content, valuesByName) };
      case "ai":
        return { kind: "ai", id: `${aiIdPrefix}${segment.id}`, prompt: substituteFields(segment.prompt, valuesByName) };
      default:
        return assertNever(segment);
    }
  });
}

export function substituteFields(content: string, values: Readonly<Record<string, FieldValue | undefined>>): string {
  return content.replace(PLACEHOLDER_PATTERN, (_placeholder, name: string) => fieldValueAsString(values[name.trim()]));
}

export function trimOuterEmptyLines(content: string): string {
  return content.replace(/^(?:[ \t]*(?:\r\n|\n|\r))+/, "").replace(/(?:(?:\r\n|\n|\r)[ \t]*)+$/, "");
}

function assertNever(value: never): never {
  throw new Error(`Unexpected template segment: ${JSON.stringify(value)}`);
}
