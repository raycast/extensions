import { control } from "./lib/kaiku";

export default async function Command() {
  await control("record/stop", "Asking Kaiku to stop recording…");
}
