import { extractSelection } from "./utils";

export default async function Command() {
  await extractSelection((t) => t.match(/https?:\/\/[^\s<>"']+/g) || [], "URLs");
}
