import { control } from "./lib/kaiku";

export default async function Command() {
  await control("record/bookmark", "Asking Kaiku to add a bookmark…");
}
