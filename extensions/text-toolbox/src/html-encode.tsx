import { quickTransform } from "./utils/quick-transform";
import { htmlEncode } from "./transformations/html-encode";

export default async function Command() {
  await quickTransform(htmlEncode);
}
