// src/lib/types/entity.ts
import { z } from "zod";

export const entitySchema = z.object({
  "entity.id": z.string(),
  "entity.name": z.string(),
  "entity.type": z.enum(["SERVICE", "HOST", "PROCESS_GROUP", "PROCESS_GROUP_INSTANCE"]),
});

export type Entity = z.infer<typeof entitySchema>;

export function buildEntityQuery(type: string, query: string): string {
  const typeMap: Record<string, string> = {
    all: "dt.entity.service",
    service: "dt.entity.service",
    host: "dt.entity.host",
    process_group: "dt.entity.process_group",
  };

  const table = typeMap[type] || "dt.entity.service";

  if (!query || query.length < 2) {
    return `fetch ${table} | limit 20`;
  }

  return `fetch ${table}
    | filter matchesPhrase(entity.name, "${query}")
    | fields entity.id, entity.name, entity.type
    | limit 20`;
}
