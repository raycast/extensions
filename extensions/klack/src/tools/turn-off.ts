import { klack } from "../lib/klack";

export default async function tool(): Promise<string> {
  if (!(await klack.isEnabled())) return "Klack was already disabled.";
  await klack.turnOff();
  return "Klack disabled.";
}
