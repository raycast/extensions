import { runFlicopy } from "./flicopy";

export default async function Command() {
  await runFlicopy("open/history");
}
