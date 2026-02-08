import { quickTransform } from "./utils/quick-transform";
import { urlDecode } from "./transformations/url-decode";

export default async function Command() {
  await quickTransform(urlDecode);
}
