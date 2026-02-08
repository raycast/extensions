import { quickTransform } from "./utils/quick-transform";
import { base64Decode } from "./transformations/base64-decode";

export default async function Command() {
  await quickTransform(base64Decode);
}
