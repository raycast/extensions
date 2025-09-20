import { fetchDisplayModeList } from "../commands";

type Input = {
  /**
   * The tagID of the display.
   */
  tagID: string;
};

/**
 * This command allows you to get the possible resolutions of a display you have a tagID for.
 * The resolutions are presented as a text, each resolution is a line.
 * like `0 - 800x600 60Hz 10bpc` where the first number identifies the resolution (resolution ID).
 * the resolution itself is the second part, the refresh rate is the third part and the last part is the bit depth.
 * Some resolutions can be marked unsafe, native, default and current.
 * The current resolution is the one that is currently used by the screen.
 * Present the options in the form of a markdown table.
 */
export default async function getResolutions(input: Input) {
  const resolutions = await fetchDisplayModeList(input.tagID);
  return resolutions;
}
