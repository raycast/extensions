import { openUlyssesCallback } from "./utils";

export default async function OpenFavorites() {
  await openUlyssesCallback("ulysses://x-callback-url/open-favorites");
}
