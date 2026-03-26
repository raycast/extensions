import { countSelection } from "./utils";

export default async function Command() {
  await countSelection((t) => t.trim().split(/\s+/).filter(Boolean).length, "Words");
}
