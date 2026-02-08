import { quickTransform } from "./utils/quick-transform";
import { htmlDecode } from "./transformations/html-decode";

export default async function Command() {
  await quickTransform(htmlDecode);
}
