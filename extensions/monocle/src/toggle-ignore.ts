import { monocle } from "./monocle";

export default async function main() {
  await monocle("ignore/toggle", "Toggled app exclusion");
}
