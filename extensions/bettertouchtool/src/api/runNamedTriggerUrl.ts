import { open } from "@raycast/api";
import { getUrlForNamedTrigger } from "../helpers";

export async function runNamedTriggerUrl(name: string) {
  const url = getUrlForNamedTrigger(name);
  await open(url);
}
