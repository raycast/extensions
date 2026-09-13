import { fetchJson, Connectable, FetchOptions } from "./client";

interface RawEntityType {
  Name?: string;
  IsSearchable?: boolean;
  IsAssignable?: boolean;
  HierarchyLevel?: number;
}

interface Collection {
  Items?: RawEntityType[];
}

export interface EntityTypeInfo {
  name: string;
  assignable: boolean;
  hierarchyLevel: number;
}

const TAKE = 200;

export function mapEntityTypes(data: Collection): EntityTypeInfo[] {
  return (data.Items ?? [])
    .filter((raw): raw is RawEntityType & { Name: string } => typeof raw.Name === "string" && raw.IsSearchable === true)
    .map((raw) => ({
      name: raw.Name,
      assignable: raw.IsAssignable === true,
      hierarchyLevel: typeof raw.HierarchyLevel === "number" ? raw.HierarchyLevel : 0,
    }))
    .sort(compareTypes);
}

/** Work items first, then by descending hierarchy level so Epic sorts above Feature above User Story. */
function compareTypes(left: EntityTypeInfo, right: EntityTypeInfo): number {
  if (left.assignable !== right.assignable) return left.assignable ? -1 : 1;
  if (left.hierarchyLevel !== right.hierarchyLevel) return right.hierarchyLevel - left.hierarchyLevel;
  return left.name.localeCompare(right.name);
}

export async function fetchEntityTypes(instance: Connectable, options: FetchOptions = {}): Promise<EntityTypeInfo[]> {
  const { data } = await fetchJson<Collection>(instance, "api/v1/EntityTypes", { take: TAKE }, options);
  return mapEntityTypes(data);
}
