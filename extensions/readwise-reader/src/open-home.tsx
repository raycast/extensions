import { open } from "@raycast/api";
import { getOpenUrl } from "./utils";

export default async function Home() {
  await open(getOpenUrl("home"));
}
