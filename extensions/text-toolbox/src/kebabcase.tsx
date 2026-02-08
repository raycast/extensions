import { quickTransform } from "./utils/quick-transform";
import { kebabcase } from "./transformations/kebabcase";

export default async function Command() {
  await quickTransform(kebabcase);
}
