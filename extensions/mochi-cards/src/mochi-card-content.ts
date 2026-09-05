import { substituteFields, trimOuterEmptyLines } from "./domain/template-engine";
import { parseTemplate } from "./domain/template-parser";
import { fieldValueAsString, type FieldValues } from "./domain/template";
import { renderRaycastMarkdown } from "./raycast-markdown";
import type { MochiCard, MochiTemplate } from "./services/mochi-client";

const MISSING_AI_CONTENT_MESSAGE = "_Update this card in Mochi to generate its content._";

export function cardMarkdown(card: MochiCard, template?: MochiTemplate): string {
  if (card.content.trim().length > 0) {
    return renderRaycastMarkdown(card.content);
  }

  const templateMarkdown = template ? renderTemplate(card, template) : undefined;
  if (templateMarkdown) {
    return templateMarkdown;
  }

  if (card.fields.length === 0) {
    return "_No card content._";
  }
  return card.fields
    .map((field) => {
      const value = fieldValueAsString(field.value);
      return `### ${field.id}\n\n${value.length === 0 ? "_Empty_" : value}`;
    })
    .join("\n\n---\n\n");
}

function renderTemplate(card: MochiCard, template: MochiTemplate): string | undefined {
  if (!template.content) {
    return undefined;
  }

  try {
    const values = templateFieldValues(card, template);
    const rendered = parseTemplate(template.content)
      .map((segment) => {
        if (segment.kind === "text") {
          return substituteFields(segment.content, values);
        }
        const prompt = trimOuterEmptyLines(substituteFields(segment.prompt, values));
        return latestAiCacheText(card, prompt) ?? MISSING_AI_CONTENT_MESSAGE;
      })
      .join("");
    return trimOuterEmptyLines(renderRaycastMarkdown(rendered)) || undefined;
  } catch {
    return undefined;
  }
}

function templateFieldValues(card: MochiCard, template: MochiTemplate): FieldValues {
  const cardFieldsById = new Map(card.fields.map((field) => [field.id, field.value]));
  return Object.fromEntries(
    template.fields.map((field) => [field.name, fieldValueAsString(cardFieldsById.get(field.id))])
  );
}

function latestAiCacheText(card: MochiCard, prompt: string): string | undefined {
  return card.aiCacheEntries
    .filter((entry) => entry.prompt === prompt || entry.prompt === `${prompt} {}`)
    .sort((left, right) => Date.parse(right.date) - Date.parse(left.date))[0]?.text;
}
