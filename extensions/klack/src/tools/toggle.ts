import { klack } from "../lib/klack";

export default async function tool(): Promise<string> {
  const enabled = await klack.toggle();
  return enabled ? "Klack is now enabled." : "Klack is now disabled.";
}
