import { quickTransform } from "./utils/quick-transform";
import { base64Encode } from "./transformations/base64-encode";

export default async function Command() {
  await quickTransform(base64Encode);
}
