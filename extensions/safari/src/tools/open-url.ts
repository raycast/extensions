import { open } from "@raycast/api";
import { safariAppIdentifier } from "../utils";

type Input = {
  /**
   * The URL to open.
   */
  url: string;
};

export default async function tool(input: Input) {
  await open(input.url, safariAppIdentifier);
}
