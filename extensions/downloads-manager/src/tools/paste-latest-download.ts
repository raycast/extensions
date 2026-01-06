import { Clipboard } from "@raycast/api";

type Input = {
  /**
   * the path of the latest download, retrieved from the "get-latest-download" tool
   */
  latestDownloadPath: string;
};

export default async function tool(input: Input) {
  try {
    await Clipboard.paste({ file: input.latestDownloadPath });
    return "Pasted latest download";
  } catch {
    throw new Error("Pasting Latest Download Failed");
  }
}
