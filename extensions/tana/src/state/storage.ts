export type StoredNode = { id: string; name: string; color?: string };

export const scopedStorageKey = (kind: "targetNodes" | "supertags", workspaceId: string) =>
  `${kind === "targetNodes" ? "pinnedTargets" : "supertagPreferences"}:${workspaceId.trim() || "legacy"}`;

export const parseStoredNodes = (value: string | undefined): StoredNode[] => {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (node): node is StoredNode =>
        typeof node === "object" &&
        node !== null &&
        "id" in node &&
        typeof node.id === "string" &&
        "name" in node &&
        typeof node.name === "string",
    );
  } catch {
    return [];
  }
};
