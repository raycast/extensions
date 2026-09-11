import { identify } from "../lib/nanoleaf-client";

export default async function tool() {
  await identify();
  return "Panels flashed.";
}
