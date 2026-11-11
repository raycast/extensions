import { setStatusCommand } from "./lib/meeting";

export default async function Command() {
  await setStatusCommand("away");
}
