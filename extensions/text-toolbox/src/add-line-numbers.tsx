import { quickTransform } from "./utils/quick-transform";
import { addLineNumbers } from "./transformations/add-line-numbers";

export default async function Command() {
  await quickTransform(addLineNumbers);
}
