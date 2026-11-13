// Label favorites always carry a Linear-provided URL on the favorite node,
// which resolves correctly for both workspace labels and team-scoped labels.
export function getLabelOpenProps(favoriteUrl?: string | null): { title: string; url: string } | null {
  if (!favoriteUrl) {
    return null;
  }

  return {
    title: "Open Label",
    url: favoriteUrl,
  };
}
