import { openCodexDeepLink } from "./lib/open-codex";

export default async function main(): Promise<void> {
  await openCodexDeepLink("codex://settings", "Settings");
}
