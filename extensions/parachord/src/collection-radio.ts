import { openParachord } from "./utils";

export default async function Command() {
  await openParachord("collection-radio", [], {}, "Starting Collection Radio");
}
