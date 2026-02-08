import { quickTransform } from "./utils/quick-transform";
import { snakecase } from "./transformations/snakecase";

export default async function Command() {
  await quickTransform(snakecase);
}
