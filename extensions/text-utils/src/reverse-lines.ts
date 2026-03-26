import { transformSelection } from "./utils";

export default async function Command() {
  await transformSelection((t) => t.split("\n").reverse().join("\n"), "Lines reversed");
}
