import { createNewIncognitoWindow } from "../lib/applescript";

/** Open a new incognito Aside window. */
export default async function tool() {
  await createNewIncognitoWindow();
  return { ok: true as const, mode: "incognito" as const };
}
