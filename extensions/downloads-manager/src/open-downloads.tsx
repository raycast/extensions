import { popToRoot, showInFinder } from "@raycast/api";
import { downloadsDir } from "./utils";

export default async function main() {
  await showInFinder(downloadsDir);
  await popToRoot();
}
