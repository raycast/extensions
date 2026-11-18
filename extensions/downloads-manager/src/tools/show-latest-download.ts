import { showInFinder } from "@raycast/api";

type Input = {
  /**
   * the path of the latest download, retrieved from the "get-latest-download" tool
   */
  latestDownloadPath: string;
};

export default async function tool(input: Input) {
  await showInFinder(input.latestDownloadPath);
  return "Showed the latest download";
}
