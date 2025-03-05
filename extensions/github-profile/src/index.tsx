import { showHUD } from "@raycast/api";

export { default as command } from "./show-github-profile";

export default async function main() {
  await showHUD("GitHub Profile extension loaded");
}
