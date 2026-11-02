import { runDirect } from "./runtime";
export default async function SetAvailable() {
  await runDirect({ kind: "solid", colour: "green" });
}
