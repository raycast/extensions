import { control } from "./lib/kaiku";

export default async function Command() {
  await control("record/bookmark", "Bookmark added");
}
