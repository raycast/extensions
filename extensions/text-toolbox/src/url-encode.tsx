import { quickTransform } from "./utils/quick-transform";
import { urlEncode } from "./transformations/url-encode";

export default async function Command() {
  await quickTransform(urlEncode);
}
