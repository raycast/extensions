import { transliterate } from "./rename";
import { runInstantRename } from "./instant-runner";

export default async function () {
  await runInstantRename((f) => transliterate(f), "Transliterate");
}
