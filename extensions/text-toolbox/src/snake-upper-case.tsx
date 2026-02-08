import { quickTransform } from "./utils/quick-transform";
import { snakeUpperCase } from "./transformations/snake-upper-case";

export default async function Command() {
  await quickTransform(snakeUpperCase);
}
