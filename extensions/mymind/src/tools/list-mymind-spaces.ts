import { listSpaces } from "../api";

interface SpaceRow {
  id: string;
  name: string;
  color?: string;
  objectCount: number;
}

/**
 * Lists the user's mymind spaces with their id, name, color, and the
 * number of objects in each.
 */
export default async function (): Promise<SpaceRow[]> {
  const spaces = await listSpaces();
  return spaces.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color ?? undefined,
    objectCount: s.objects?.length ?? 0,
  }));
}
