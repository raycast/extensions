import { getPassClient } from "./lib/pass/client";

export default async function Command() {
  const client = getPassClient();
  await client.getAllVaults(true);
  await client.getItems(null, true);
}
