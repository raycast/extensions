import { openUlyssesCallback } from "./utils";

export default async function OpenAll() {
  await openUlyssesCallback("ulysses://x-callback-url/open-all");
}
