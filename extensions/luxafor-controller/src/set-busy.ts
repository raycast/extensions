import { runDirect } from "./runtime";
export default async function SetBusy() {
  await runDirect({ kind: "solid", colour: "red" });
}
