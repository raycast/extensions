import { stopDoorstopper } from "./util";

export default async function main() {
  await stopDoorstopper({ menubar: false, status: false }, "Doorstopper is now disabled");
}
