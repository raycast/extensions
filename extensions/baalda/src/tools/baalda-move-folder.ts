import { moveFolder } from "../lib/baalda";

type Input = {
  /** Folder id from baalda-list-folders. */
  folderId: string;
  /** New vault-relative folder path. */
  path?: string;
  /** New folder name. */
  name?: string;
  /** New parent folder id. Omit to leave it unchanged. */
  parentId?: string;
  /** Set true to move the folder to the vault root. */
  moveToRoot?: boolean;
};

/** Rename or move a Baalda folder and its descendants. */
export default async function tool(input: Input): Promise<string> {
  const result = await moveFolder({
    folderId: input.folderId,
    path: input.path,
    name: input.name,
    parentId: input.moveToRoot ? null : input.parentId,
  });
  return JSON.stringify({ ok: true, result }, null, 2);
}

export const confirmation = async (input: Input) => ({
  message: `Rename or move folder "${input.folderId}" and its contents?`,
});
