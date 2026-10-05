import { stripSpecialChars } from "./rename";
import { runInstantRename } from "./instant-runner";

export default async function () {
  await runInstantRename((f) => stripSpecialChars(f), "Strip Special Characters");
}
