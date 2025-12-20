import { Action, Tool } from "@raycast/api";
import { deleteFileOrFolder } from "../utils";

type Input = {
  /**
   * the path of the latest download, retrieved from the "get-latest-download" tool
   */
  latestDownloadPath: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Are you sure you want to delete ${input.latestDownloadPath}?`,
    style: Action.Style.Destructive,
  };
};

export default async function tool(input: Input) {
  try {
    await deleteFileOrFolder(input.latestDownloadPath);
    return "Deleted lastest download";
  } catch {
    throw new Error("Deletion Failed");
  }
}
