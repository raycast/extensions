import { transformSelection } from "./utils";

export default async function Command() {
  await transformSelection((t) => [...new Set(t.split("\n"))].join("\n"), "Duplicates removed");
}
