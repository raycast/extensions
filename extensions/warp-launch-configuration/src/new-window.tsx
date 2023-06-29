import { open } from "@raycast/api";

export default async function Command() {
  await open("warp://action/new_window?path=~");
}
