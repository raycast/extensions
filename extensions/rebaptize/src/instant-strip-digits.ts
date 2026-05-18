import { stripDigits } from "./rename";
import { runInstantRename } from "./instant-runner";

export default async function () {
  await runInstantRename((f) => stripDigits(f), "Strip Digits");
}
