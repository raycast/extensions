import { quickTransform } from "./utils/quick-transform";
import { pascalcase } from "./transformations/pascalcase";

export default async function Command() {
  await quickTransform(pascalcase);
}
