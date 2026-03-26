import { countSelection } from "./utils";

export default async function Command() {
  await countSelection((t) => (t.match(/ /g) || []).length, "Spaces");
}
