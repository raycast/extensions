import { getAuthenticatedArena } from "./arenaAuth";
import { arenaReference } from "../utils/references";
import { Tool } from "@raycast/api";
type Input = {
  /** Connection ID returned by get-channel-contents. This is NOT a block ID. */
  connectionId: string;
};
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Remove connection ${input.connectionId}? The content itself will remain on Are.na.`,
});
export default async function tool(input: Input) {
  try {
    const id = arenaReference(input.connectionId, "block");
    const arena = await getAuthenticatedArena();
    await arena.connection(id).delete();
    return { removed: true, connection_id: Number(id) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
