import { runControl } from "./run-control";

export default async function Command(): Promise<void> {
  await runControl("/heat-protection/disable", "Disable Heat Protection");
}
