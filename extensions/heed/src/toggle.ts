import { tell } from "./heed";

export default async function command() {
  await tell("toggle", "Toggling focus follows mouse");
}
