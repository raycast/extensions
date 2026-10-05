export const NEW_TAG_PREFIX = "new:";

export function buildTagsToAttach(
  selectedTagIds: string[],
  newTagItems: Array<{ id: string; name: string }>,
): Array<{ tagId?: string; tagName?: string; attachedBy: "human" }> {
  return selectedTagIds.map((id) => {
    if (id.startsWith(NEW_TAG_PREFIX)) {
      const item = newTagItems.find((t) => t.id === id);
      return { tagName: item?.name ?? id.slice(NEW_TAG_PREFIX.length), attachedBy: "human" };
    }
    return { tagId: id, attachedBy: "human" };
  });
}
