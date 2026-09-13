import type { HubWidgetDefinition } from "@synap/hub-rest-client";
import { listWidgetDefinitions } from "../api/client";

type Input = {
  /** Optional workspace ID. Omit for system + unscoped builtins. */
  workspaceId?: string;
};

function typeKeyOf(row: HubWidgetDefinition): string {
  return typeof row.typeKey === "string" && row.typeKey ? row.typeKey : typeof row.kind === "string" ? row.kind : "";
}

/**
 * Compose widget allowlist (builtins + generated widgets). Do not guess keys.
 * Place widgets in Synap Browser — Raycast cannot render a dashboard.
 */
export default async function tool(input: Input) {
  const rows = await listWidgetDefinitions(
    input.workspaceId?.trim() ? { workspaceId: input.workspaceId.trim() } : undefined
  );

  const builtins: Array<{
    key: string;
    name?: string;
    description?: string | null;
    category?: string;
    notes?: string;
    defaultSize?: { w: number; h: number };
    requiredConfig?: string[];
  }> = [];
  const aliases: Array<{ key: string; name?: string; aliasOf: string }> = [];
  const generated: Array<{
    key: string;
    name?: string;
    description?: string | null;
    rendererType?: string;
    workspaceId?: string | null;
  }> = [];

  for (const row of rows) {
    const key = typeKeyOf(row);
    if (!key) continue;
    if (row.source === "compose-catalog") {
      if (row.aliasOf) {
        aliases.push({ key, name: row.name, aliasOf: row.aliasOf });
      } else {
        const required = Array.isArray((row.configSchema as { required?: unknown } | undefined)?.required)
          ? (row.configSchema as { required: string[] }).required
          : undefined;
        builtins.push({
          key,
          name: row.name,
          description: row.description,
          category: row.category,
          notes: row.notes,
          defaultSize: row.defaultSize,
          requiredConfig: required,
        });
      }
      continue;
    }
    if (key.startsWith("generated:") || row.rendererType === "frame") {
      generated.push({
        key,
        name: row.name,
        description: row.description,
        rendererType: row.rendererType,
        workspaceId: row.workspaceId ?? null,
      });
    }
  }

  return {
    builtins,
    aliases,
    generated,
    notes: [
      "Never guess a widget key — use this list.",
      "view / view-table / view-* require config.viewId (a saved view UUID). profileSlug is not enough.",
      "Counts: stat-card + profileSlug. entity-count is a legacy alias.",
      "Profile-scoped collections without a saved view: entity-list + profileSlug.",
    ],
  };
}
