import { runDirect } from "./runtime";
export default async function TurnOff() {
  await runDirect({ kind: "solid", colour: "off" });
}
