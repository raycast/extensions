import { Action, environment, Tool, trash } from "@raycast/api";
import { join } from "node:path";
import { reviewCleanup, trashArtifacts } from "../services/ai-cleanup";

type Input = {
  /** scanId returned by search-artifacts. Valid for 30 minutes and one cleanup operation. Never invent one. */
  scanId: string;
  /** Exact absolute paths returned by that scan and selected by the user. No globs, parent directories, or inferred paths. */
  paths: string[];
};

const storage = join(environment.supportPath, "ai-scans");

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  style: Action.Style.Destructive,
  ...(await reviewCleanup(storage, input)),
});

/** Move selected scan results to Trash after Raycast confirmation. Revalidates original directory identities and returns each path's outcome. Never permanently deletes files. */
export default async function tool(input: Input) {
  return trashArtifacts(storage, input, trash);
}
