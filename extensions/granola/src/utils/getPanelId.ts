export function getPanelId(panels: Record<string, unknown>, docId: string): string | undefined {
  if (!panels || !panels[docId]) return undefined;
  const panel = panels[docId];
  if (typeof panel !== "object" || panel === null) return undefined;
  const keys = Object.keys(panel);
  return keys.length > 0 ? keys[0] : undefined;
}
