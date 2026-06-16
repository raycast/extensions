import { open } from "@raycast/api";

// Kagi Small Web — opening /smallweb 302-redirects to a random small-web page each time.
export default async function Command() {
  await open("https://kagi.com/smallweb");
}
