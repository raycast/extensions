import resize from "./resize";
import { ActionFn } from "../types";
import upload from "./upload";
import overwrite from "./overwrite";
import convert from "./convert";
import compress from "./compress";
import clipboard from "./clipboard";
import tomarkdown from "./tomarkdown";
import rename from "./rename";

const actions = {
  compress: compress,
  resize: resize,
  convert: convert,
  upload: upload,
  overwrite: overwrite,
  clipboard: clipboard,
  tomarkdown: tomarkdown,
  rename: rename,
} as Record<string, ActionFn>;

export default function resolveAction(name: string): ActionFn {
  if (Object.hasOwn(actions, name)) {
    return actions[name as keyof typeof actions];
  }

  throw new Error(`Action not found: ${name}`);
}
