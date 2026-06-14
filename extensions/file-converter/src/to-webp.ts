import { convertFinderImageTo } from "./convert-image";

export default async function Command() {
  await convertFinderImageTo("webp", "WebP");
}
