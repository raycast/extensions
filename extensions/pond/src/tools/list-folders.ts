import { pond } from "../api/client";
import { folderPaths } from "../lib/display";

export default async function tool() {
  return folderPaths(await pond().folders()).map((folder) => ({
    id: folder.id,
    name: folder.name,
    path: folder.path,
    saves: folder.count,
  }));
}
