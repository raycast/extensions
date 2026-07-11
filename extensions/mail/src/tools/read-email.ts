import { readFile } from "fs/promises";
import { parseMessage } from "../utils/parse-message";

type Input = {
  /**
   * File path of the email to read.
   *
   * You can get the file path using the `search-messages` tool.
   */
  filePath: string;
};

export default async function (input: Input) {
  const parsedMessage = await readFile(input.filePath, "utf-8").then(parseMessage);

  return parsedMessage;
}
