import { setListeningMode } from "./controls/delegate-listening-mode";

export default async function main() {
  await setListeningMode("adaptive");
}
