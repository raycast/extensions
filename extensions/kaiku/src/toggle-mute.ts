import { control } from "./lib/kaiku";

export default async function Command() {
  await control("mute/toggle", "Microphones mute toggled");
}
