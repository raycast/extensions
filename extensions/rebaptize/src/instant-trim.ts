import { trimFilename } from "./rename";
import { runInstantRename } from "./instant-runner";

export default async function () {
  await runInstantRename((f) => trimFilename(f), "Trim Filenames");
}
