import { openSnapzy } from "./snapzy";

export default async function Command() {
  await openSnapzy("open/history");
}
