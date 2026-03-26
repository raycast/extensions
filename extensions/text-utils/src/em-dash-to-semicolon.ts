import { transformSelection } from "./utils";

export default async function Command() {
  await transformSelection((t) => t.replace(/\u2014/g, ";"), "Replaced em dash → ;");
}
