import { quickTransform } from "./utils/quick-transform";
import { hexEncode } from "./transformations/hex-encode";

export default async function Command() {
  await quickTransform(hexEncode);
}
