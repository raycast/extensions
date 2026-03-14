export function getAdjacentItemId(
  itemIds: readonly string[],
  currentItemId: string | null,
  direction: "next" | "previous",
): string | null {
  if (!itemIds.length) {
    return null;
  }

  if (currentItemId === null) {
    return itemIds[0];
  }

  const currentIndex = itemIds.indexOf(currentItemId);

  if (currentIndex === -1) {
    return itemIds[0];
  }

  if (direction === "next") {
    return itemIds[Math.min(currentIndex + 1, itemIds.length - 1)];
  }

  return itemIds[Math.max(currentIndex - 1, 0)];
}
