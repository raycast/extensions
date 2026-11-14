import { runAction } from "./lib/screenflare";

export default async function Command() {
  await runAction("all-in-one");
}
