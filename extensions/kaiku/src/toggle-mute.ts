import { control } from "./lib/kaiku";

export default async function Command() {
  await control("mute/toggle", "Asking Kaiku to toggle the microphones…");
}
