import { runInstantRename } from "./instant-runner";
import { generateCaseName } from "./rename";

export default async function () {
  await runInstantRename((f) => generateCaseName(f, "lowercase", true), "Lowercase All");
}
