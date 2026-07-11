import { getValidatedSpaceTitle, makeNewWindow } from "../arc";

type Input = {
  /**
   * The space ID to open the new window in.
   *
   * @remarks
   * Use `get-spaces` to get the Id of a space. If space is not specified, omit it.
   */
  spaceId?: string;
};

const tool = async (input: Input) => {
  const space = await getValidatedSpaceTitle(input.spaceId);
  await makeNewWindow({ space: space });
};

export default tool;
