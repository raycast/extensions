import { countSelection } from "./utils";

export default async function Command() {
  await countSelection((t) => t.replace(/[^a-zA-Z]/g, "").length, "Letters");
}
