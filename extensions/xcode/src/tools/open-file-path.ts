import { open } from "@raycast/api";

type Input = {
  /**
   * The file path.
   */
  filePath: string;
};

/**
 * Opens a file path.
 * @param input The input.
 */
export default (input: Input) => open(input.filePath);
