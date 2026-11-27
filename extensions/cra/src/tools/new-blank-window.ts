import { Tool } from "@raycast/api";
import { makeNewBlankWindow } from "../cra";

export const confirmation: Tool.Confirmation<Record<string, never>> = async () => {
  return { message: "Open a new blank Cra window?" };
};

const tool = async () => {
  await makeNewBlankWindow();
};

export default tool;
