import { getAuthenticatedArena } from "./arenaAuth";
import { arenaReference } from "../utils/references";
import { userSummary } from "./summarize";
type Input = {
  /** User ID, slug, or Are.na profile URL. */
  identifier: string;
};
export default async function tool(input: Input) {
  try {
    const id = arenaReference(input.identifier, "user");
    const arena = await getAuthenticatedArena();
    return { user: userSummary(await arena.user(id).get()) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
