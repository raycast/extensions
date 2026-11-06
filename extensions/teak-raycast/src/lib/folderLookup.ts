import type { RaycastFolder } from "./api";

/**
 * The manual folder a person or model named, by id or by name. Throws a
 * message fit to show when there is none, or when it is a smart folder.
 */
export const findManualFolder = (
  folders: readonly RaycastFolder[],
  nameOrId: string,
): RaycastFolder => {
  const wanted = nameOrId.trim();
  const folder =
    folders.find((candidate) => candidate.id === wanted) ??
    folders.find(
      (candidate) => candidate.name.toLowerCase() === wanted.toLowerCase(),
    );
  if (!folder) {
    throw new Error(
      `No folder named "${wanted}". Use list-folders to see them.`,
    );
  }
  if (folder.kind === "smart") {
    throw new Error(
      `"${folder.name}" is a smart folder. It shows the cards its search finds, so cards can't be added.`,
    );
  }
  return folder;
};
