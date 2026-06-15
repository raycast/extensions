import { runAction } from "./actions";

export default async function Command() {
  await runAction("play");
}
