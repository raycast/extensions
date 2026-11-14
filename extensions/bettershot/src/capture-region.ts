import { runAction } from "./lib/bettershot";

export default async function Command() {
  await runAction("capture/region");
}
