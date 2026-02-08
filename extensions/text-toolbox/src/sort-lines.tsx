import { quickTransform } from "./utils/quick-transform";
import { sortLines } from "./transformations/sort-lines";

export default async function Command() {
  await quickTransform(sortLines);
}
