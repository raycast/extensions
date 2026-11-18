import { removeAccents } from "./rename";
import { runInstantRename } from "./instant-runner";

export default async function () {
  await runInstantRename((f) => removeAccents(f), "Remove Accents");
}
