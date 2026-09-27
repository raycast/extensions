import { tell } from "./heed";

export default async function command() {
  await tell("set/warpPointer/true", "Turning mouse follows focus on");
}
