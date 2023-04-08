import { Clipboard } from "@raycast/api";
import removeDecorators from "./utils/removeDecorators";

export default async () => {
  await removeDecorators((await Clipboard.readText()) || "");
};
