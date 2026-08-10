import { padNumbersInName } from "./rename";
import { runInstantRename } from "./instant-runner";

export default async function () {
  await runInstantRename((f) => padNumbersInName(f, 3), "Pad Numbers");
}
