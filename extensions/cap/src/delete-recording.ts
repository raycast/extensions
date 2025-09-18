import { open } from "@raycast/api";

export default async function Command() {
  await open("cap-desktop://delete_recording");
  return null;
}
