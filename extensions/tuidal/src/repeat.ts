import { showHUD } from "@raycast/api";
import { api } from "./api";

const nextMode: Record<string, string> = {
  all: "one",
  one: "off",
  off: "all",
};

export default async function Repeat() {
  try {
    const before = await api.status();
    await api.repeat();
    const next = nextMode[before.repeat] ?? "all";
    await showHUD(`🔁 Repeat: ${next}`);
  } catch {
    await showHUD("⚠️ Tuidal not running");
  }
}
