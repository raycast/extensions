export function getPanelId(panels: Record<string, unknown>, docId: string): string | undefined {
  if (!panels || !panels[docId]) return undefined;
  const keys = Object.keys(panels[docId]);
  return keys.length > 0 ? keys[0] : undefined;
}
