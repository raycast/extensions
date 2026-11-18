import { openParachord } from "./utils";

export default async function Command() {
  await openParachord("control", ["previous"], {}, "Back to previous track");
}
