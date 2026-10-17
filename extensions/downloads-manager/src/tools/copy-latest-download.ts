import { Clipboard } from "@raycast/api";

type Input = {
  /**
   * the path of the latest download, retrieved from the "get-latest-download" tool
   */
  latestDownloadPath: string;
};

export default async function tool(input: Input) {
  await Clipboard.copy({ file: input.latestDownloadPath });

  return "Copied latest download to clipboard";
}
