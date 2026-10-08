import { openUlyssesCallback } from "./utils";

export default async function OpenRecent() {
  await openUlyssesCallback("ulysses://x-callback-url/open-recent");
}
