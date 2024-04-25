import { open } from "@raycast/api";

export default async function Command() {
  await open("https://github.com/cuixueshe/earthworm/pulls");
}
