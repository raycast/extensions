import { open } from "@raycast/api";

export async function openOpenOatsUrl(target: string) {
  await open(target);
}
