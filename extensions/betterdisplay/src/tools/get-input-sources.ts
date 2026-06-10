import { fetchInputSources } from "../commands";

type Input = {
  /**
   * The tagID of the display.
   */
  tagID: string;
};

export default async function toolGetInputSources(input: Input) {
  const sources = await fetchInputSources(input.tagID);
  if (sources.length === 0) {
    return "No custom input sources configured for this display. Configure them in BetterDisplay Settings > Displays > Customize input source list.";
  }
  return sources;
}
