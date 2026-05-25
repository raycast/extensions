import { klack } from "../lib/klack";

export default async function tool(): Promise<string> {
  if (await klack.isEnabled()) return "Klack was already enabled.";
  await klack.turnOn();
  return "Klack enabled.";
}
