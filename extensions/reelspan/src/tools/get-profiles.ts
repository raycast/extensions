import { client } from "../lib/client";
import { profiles } from "../lib/reelspan";

/** Lists the user's Reelspan profiles and the networks each has connected. */
export default async function tool() {
  return profiles(client());
}
