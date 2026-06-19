import { wrapSelection } from "./lib/wrap";

export default async function Command() {
  await wrapSelection("double-quotes");
}
