import { open } from "@raycast/api";
import { FAVORO_WEB_URL } from "./lib/constants";

export default async function Command(): Promise<void> {
  await open(FAVORO_WEB_URL);
}
