import { List } from "@raycast/api";
import type { ItemDefinition, SingleLanguageBlueprintItemDefinition } from "../types";

interface DefinitionsListProps {
  definitions: (ItemDefinition | SingleLanguageBlueprintItemDefinition)[];
}

export function DefinitionsList({ definitions }: DefinitionsListProps) {
  if (!definitions.length) {
    return <List.Item.Detail.Metadata.Label title="No definitions" text="—" />;
  }

  return (
    <>
      {definitions.map((def, index) => (
        <List.Item.Detail.Metadata.Label
          key={index}
          title={`Definition ${index + 1}`}
          text={def.translation ?? def.definition ?? "—"}
        />
      ))}
    </>
  );
}

export function formatDefinitionMarkdown(def: ItemDefinition | SingleLanguageBlueprintItemDefinition): string {
  const parts: string[] = [];

  if (def.translation) {
    parts.push(`**${def.translation}**`);
  }

  if (def.definition) {
    if (def.translation) {
      parts.push(`*${def.definition}*`);
    } else {
      parts.push(`**${def.definition}**`);
    }
  }

  if (def.comment) {
    parts.push(def.comment);
  }

  if (def.examples?.length) {
    const exampleLines = def.examples.map((ex) => `• ${ex}`).join("\n\n");
    parts.push(`Examples:\n\n${exampleLines}`);
  }

  return parts.join("\n\n");
}

export function formatDefinitionsMarkdown(
  definitions: (ItemDefinition | SingleLanguageBlueprintItemDefinition)[],
): string {
  if (!definitions.length) {
    return "*No definitions*";
  }

  return definitions.map(formatDefinitionMarkdown).join("\n\n---\n\n");
}
