import { countSelection } from "./utils";

export default async function Command() {
  await countSelection((t) => (t.trim() === "" ? 0 : t.split("\n").length), "Lines");
}
