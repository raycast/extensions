import { createNewWindow } from "../lib/applescript";

/** Open a new normal Aside window. */
export default async function tool() {
  await createNewWindow();
  return { ok: true as const, mode: "normal" as const };
}
