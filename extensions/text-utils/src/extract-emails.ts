import { extractSelection } from "./utils";

export default async function Command() {
  await extractSelection((t) => t.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [], "emails");
}
