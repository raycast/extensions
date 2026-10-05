import { control } from "./lib/kaiku";

export default async function Command() {
  await control("record/pause", "Asking Kaiku to pause or resume…");
}
