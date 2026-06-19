import { getEffects } from "../lib/nanoleaf-client";

export default async function tool() {
  const effects = await getEffects();
  return { effects };
}
