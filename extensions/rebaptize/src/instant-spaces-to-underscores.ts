import { runInstantRename } from "./instant-runner";
import { generateSwapDelimiterName } from "./rename";

export default async function () {
  await runInstantRename((f) => generateSwapDelimiterName(f, " ", "_"), "Spaces → Underscores");
}
