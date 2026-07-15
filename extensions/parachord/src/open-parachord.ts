import { openParachord } from "./utils";

export default async function Command() {
  await openParachord("home", [], {}, "Opening Parachord");
}
