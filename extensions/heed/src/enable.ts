import { tell } from "./heed";

export default async function command() {
  await tell("enable", "Turning focus follows mouse on");
}
