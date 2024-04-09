import { adjustBrightness, getSystemBrightness } from "./utils";

export default async function command() {
  const brightness = await getSystemBrightness();
  await adjustBrightness(brightness!, "decrease");
}
