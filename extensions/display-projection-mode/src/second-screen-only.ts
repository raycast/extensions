import { switchDisplay } from "./switch-display";

export default async function main() {
  await switchDisplay("/external", "Switching to Second Screen Only...");
}
