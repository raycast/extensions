const SCHEMA_PATTERN = /<!-- task-model-schema:start -->\s*```sql\n([\s\S]*?)\n```\s*<!-- task-model-schema:end -->/;

export function extractTaskModelSchema(markdown: string): string {
  const schema = markdown.match(SCHEMA_PATTERN)?.[1]?.trim();
  if (!schema) {
    throw new Error("Task model documentation does not contain one marked SQL schema block");
  }
  return `${schema}\n`;
}
