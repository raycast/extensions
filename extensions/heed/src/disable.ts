import { tell } from "./heed";

export default async function command() {
  await tell("disable", "Turning focus follows mouse off");
}
