import { quickTransform } from "./utils/quick-transform";
import { hexDecode } from "./transformations/hex-decode";

export default async function Command() {
  await quickTransform(hexDecode);
}
