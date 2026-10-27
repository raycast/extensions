import { deleteFolder } from "../lib/baalda";

type Input = {
  /** Folder id from baalda-list-folders. */
  folderId: string;
  /** Also delete notes and subfolders inside it. Defaults to false. */
  recursive?: boolean;
};

/** Delete a Baalda folder, optionally with its contents. */
export default async function tool(input: Input): Promise<string> {
  const result = await deleteFolder(input.folderId, input.recursive ?? false);
  return JSON.stringify({ ok: true, result }, null, 2);
}

export const confirmation = async (input: Input) => ({
  message: `Delete folder "${input.folderId}"${input.recursive ? " and its contents" : ""}?`,
});
