import { batchSchema, catalogSchema, FileBatch, Mutation } from "./models";
import * as native from "swift:../../swift/finder-tags";

// Parse the JSON boundary explicitly; Swift's generated declarations do not describe custom structs reliably.
export async function readFiles(paths: string[]): Promise<FileBatch> {
  return batchSchema.parse(JSON.parse(await native.getTags(paths)));
}

export async function readPalette() {
  return catalogSchema.parse(JSON.parse(await native.getFinderTags()));
}

export async function volumePath(path: string): Promise<string> {
  return native.getVolumePath(path);
}

export async function writeFiles(paths: string[], mutation: Mutation): Promise<FileBatch> {
  let result: string;
  switch (mutation.kind) {
    case "add":
      result = await native.addTags(paths, mutation.tags);
      break;
    case "remove":
      result = await native.removeTags(paths, mutation.tags);
      break;
    case "set":
      result = await native.setTags(paths, mutation.tags);
      break;
    case "rename":
      result = await native.renameTag(paths, mutation.oldName, mutation.newName);
      break;
  }
  return batchSchema.parse(JSON.parse(result));
}
