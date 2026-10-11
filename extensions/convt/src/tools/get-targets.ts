import { getTargets } from "../lib/convt";
import { getBinary } from "../lib/preferences";

type Input = {
  /** Absolute paths to existing local files. All returned formats work for every input. */
  files: string[];
};

/** Discover the common output formats available for these files using the locally installed Convt engines. */
export default async function tool(input: Input) {
  return getTargets(await getBinary(), input.files);
}
