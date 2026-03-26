import { transformSelection } from "./utils";

export default async function Command() {
  await transformSelection((t) => t.replace(/"/g, "'"), "Replaced \" → '");
}
