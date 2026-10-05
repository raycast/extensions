import { unpadNumbersInName } from "./rename";
import { runInstantRename } from "./instant-runner";

export default async function () {
  await runInstantRename((f) => unpadNumbersInName(f), "Remove Number Padding");
}
