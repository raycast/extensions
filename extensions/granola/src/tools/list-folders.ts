import { showFailureToast } from "@raycast/utils";
import { getFolderInfoForAI } from "../utils/folderHelpers";
import { toError } from "../utils/errorUtils";

interface Input {}

type Output = Array<{
  id: string;
  name: string;
  description?: string;
  noteCount: number;
  createdAt: string;
  noteIds: string[];
}>;

/**
 * Returns a list of folders with metadata and note counts.
 */
export default async function tool(input: Input = {}): Promise<Output> {
  void input;
  try {
    return await getFolderInfoForAI();
  } catch (error) {
    showFailureToast(toError(error), { title: "Failed to fetch folders" });
    return [];
  }
}
