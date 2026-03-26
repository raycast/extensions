import { transformSelection } from "./utils";

export default async function Command() {
  await transformSelection((t) => t.replace(/(^|\s)'(.*?)'(\s|$)/gm, '$1"$2"$3'), "Replaced ' → \"");
}
