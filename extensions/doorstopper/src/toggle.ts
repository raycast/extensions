import { isDoorstopperEnabled, startDoorstopper, stopDoorstopper } from "./util";

export default async function main() {
  if (isDoorstopperEnabled()) {
    await stopDoorstopper({ menubar: true, status: true }, "Doorstopper is now disabled");
  } else {
    await startDoorstopper({ menubar: true, status: true }, "Doorstopper is now enabled");
  }
}
