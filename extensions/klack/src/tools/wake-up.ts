import { klack } from "../lib/klack";

export default async function tool(): Promise<string> {
  if (!(await klack.isSleeping())) return "Klack was already awake.";
  await klack.wakeUp();
  return "Klack woken up.";
}
