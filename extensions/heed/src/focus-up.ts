import { tell } from "./heed";

export default async function command() {
  await tell("focus/up");
}
