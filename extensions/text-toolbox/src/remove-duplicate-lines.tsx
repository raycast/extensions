import { quickTransform } from "./utils/quick-transform";
import { removeDuplicateLines } from "./transformations/remove-duplicate-lines";

export default async function Command() {
  await quickTransform(removeDuplicateLines);
}
