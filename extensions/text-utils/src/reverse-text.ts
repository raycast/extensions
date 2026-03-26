import { transformSelection } from "./utils";

export default async function Command() {
  await transformSelection((t) => [...t].reverse().join(""), "Text reversed");
}
