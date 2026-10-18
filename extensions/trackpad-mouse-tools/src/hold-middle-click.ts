import { holdCommand } from "./lib/click-commands";

export default async function Command() {
  await holdCommand("middle");
}
