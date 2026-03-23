import { switchDisplay } from "./switch-display";

export default async function main() {
  await switchDisplay("/internal", "Switching to PC Screen Only...");
}
