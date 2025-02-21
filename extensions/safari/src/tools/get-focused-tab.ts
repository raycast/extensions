import { ContentType, getCurrentTabContents } from "../utils";

type Input = {
  /**
   * The type of content to get.
   * @default "text"
   * @remarks
   * - "text" returns the text of the active tab.
   * - "source" returns the HTML source code of the active tab. Use only if you need the HTML source code.
   */
  type: ContentType;
};

const tool = async (input: Input) => {
  return await getCurrentTabContents(input.type);
};

export default tool;
