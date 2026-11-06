import { inspectFiles } from "../lib/convt";
import { getBinary } from "../lib/preferences";

type Input = {
  /** Absolute paths to existing local files. All returned targets work for every input. */
  files: string[];
};

/** Identify file types by extension and return supported targets and suggested target IDs from Convt. */
export default async function tool(input: Input) {
  return inspectFiles(await getBinary(), input.files);
}
