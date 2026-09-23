import { open } from "@raycast/api";

import { THE_FOREST_URL } from "./the-forest";

export default async function Command() {
  await open(THE_FOREST_URL);
}
