import { transformSelection } from "./utils";

export default async function Command() {
  await transformSelection((t) => t.replace(/\?[^\s#]*(#[^\s]*)?/g, "$1"), "Query params removed");
}
