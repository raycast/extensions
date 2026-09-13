import { open } from "@raycast/api";

import { createGameUrl } from "./lib/lichessUrls";

export default async function Command() {
  await open(createGameUrl());
}
