import { Tool } from "@raycast/api";
import { getValidatedSpaceTitle, makeNewWindow } from "../cra";

type Input = {
  /**
   * The space ID to open the new window in.
   *
   * @remarks
   * Use `get-spaces` to get the Id of a space. If space is not specified, omit it.
   */
  spaceId?: string;
};

export const confirmation: Tool.Confirmation<Input> = async () => {
  return { message: "Open a new Cra window?" };
};

const tool = async (input: Input) => {
  const space = await getValidatedSpaceTitle(input.spaceId);
  await makeNewWindow({ space });
};

export default tool;
