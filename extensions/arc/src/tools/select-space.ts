import { selectSpaceById } from "../arc";

type Input = {
  /**
   * The ID of the space to select.
   *
   * @remarks
   * Use `get-spaces` to get the ID of a space.
   */
  spaceId: string;
};

const tool = async (input: Input) => {
  await selectSpaceById(input.spaceId);
};

export default tool;
