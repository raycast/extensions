export function buildObjectMetadata(input: {
  title?: string;
  tags?: string[];
  spaceId?: string;
}): Record<string, unknown> {
  return {
    title: input.title || undefined,
    tags: input.tags?.filter(Boolean).map((name) => ({ name })),
    spaces: input.spaceId ? [{ id: input.spaceId }] : undefined,
  };
}
