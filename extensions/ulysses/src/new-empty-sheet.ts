import { openUlyssesCallback } from "./utils";

export default async function NewEmptySheet() {
  await openUlyssesCallback("ulysses://x-callback-url/new-sheet");
}
