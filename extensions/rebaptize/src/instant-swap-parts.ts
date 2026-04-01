import { swapParts } from "./rename";
import { runInstantRename } from "./instant-runner";

export default async function () {
  await runInstantRename((f) => swapParts(f, " - "), "Swap Parts");
}
