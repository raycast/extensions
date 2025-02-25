import { open } from "@raycast/api";
import { safariAppIdentifier } from "../utils";

type Input = {
  /**
   * The URL to open.
   */
  url: string;
};

const tool = async (input: Input) => {
  await open(input.url, safariAppIdentifier);
};

export default tool;
