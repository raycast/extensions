import { open } from "@raycast/api";

export default async function Command(): Promise<void> {
  await open("https://tetheredmac.com/");
}
