import { popToRoot, render, showHUD } from "@raycast/api";
import { ha } from "./components";
import open from "open";

async function main() {
  open(ha.url);
  showHUD("Open Dashboard");
  popToRoot();
}

main();
