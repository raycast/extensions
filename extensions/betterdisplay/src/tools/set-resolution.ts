import { Tool } from "@raycast/api";
import { fetchDisplayModeList, setDisplayResolution } from "../commands";
import { parseResolutionList } from "../utils";

type Input = {
  /**
   * The tagID of the display.
   */
  tagID: string;

  /**
   * The resolution ID to set.
   */
  resolutionID: string;
};

export default async function (input: Input) {
  return setDisplayResolution(input.tagID, input.resolutionID);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const stdout = await fetchDisplayModeList(input.tagID);
  const options = parseResolutionList(stdout);
  const option = options.find((option) => option.modeNumber === input.resolutionID);

  return {
    message: `Are you sure you want to set the resolution to ${option?.resolution ?? "unknown resolution"}?`,
  };
};
