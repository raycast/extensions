import { listSpaces } from "../api";

type SpaceSummary = {
  id: string;
  name: string;
  color?: string;
};

/**
 * List the user's mymind spaces (collections). Use this to resolve a space name
 * to its id before saving or moving an item into a space.
 */
export default async function tool(): Promise<SpaceSummary[]> {
  const spaces = await listSpaces();
  return spaces.map((space) => ({ id: space.id, name: space.name, color: space.color }));
}
