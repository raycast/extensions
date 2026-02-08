import { quickTransform } from "./utils/quick-transform";
import { reverseLines } from "./transformations/reverse-lines";

export default async function Command() {
  await quickTransform(reverseLines);
}
