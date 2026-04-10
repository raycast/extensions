import { wrapSelectedText } from "./utils";

export default async function Command() {
  await wrapSelectedText('"');
}
