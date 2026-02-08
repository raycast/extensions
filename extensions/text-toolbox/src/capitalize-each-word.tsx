import { quickTransform } from "./utils/quick-transform";
import { capitalizeEachWord } from "./transformations/capitalize-each-word";

export default async function Command() {
  await quickTransform(capitalizeEachWord);
}
