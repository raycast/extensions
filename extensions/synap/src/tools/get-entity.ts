import { getEntity } from "../api/client";

type Input = {
  /** Entity ID. Use get-connections separately when you need graph relations, threads, or focus sessions. */
  id: string;
};

export default async function tool(input: Input) {
  const entity = await getEntity(input.id);

  return {
    id: entity.id,
    title: entity.title,
    type: entity.profileSlug,
    description: entity.content,
    status: entity.status,
    priority: entity.priority,
    dueDate: entity.dueDate,
    url: entity.url,
    facetSlugs: (entity as { facetSlugs?: string[] }).facetSlugs,
    properties: entity.properties,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
