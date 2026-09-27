import { tell } from "./heed";

export default async function command() {
  await tell("set/warpPointer/false", "Turning mouse follows focus off");
}
