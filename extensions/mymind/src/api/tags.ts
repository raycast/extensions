import { api } from "./client";
import { Tag, TagSchema, unwrapList } from "./schemas";

export async function listTags(limit = 1000): Promise<Tag[]> {
  const data = await api.get<unknown>("/tags", { query: { limit } });
  return unwrapList(TagSchema, data, ["tags", "items"]);
}
