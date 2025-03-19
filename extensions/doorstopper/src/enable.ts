import { startDoorstopper } from "./util";

export default async function main() {
  await startDoorstopper({ menubar: true, status: true }, "Doorstopper is now enabled");
}
