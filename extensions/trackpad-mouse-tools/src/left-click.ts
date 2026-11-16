import { clickCommand } from "./lib/click-commands";

export default async function Command() {
  await clickCommand("left");
}
