import { quickTransform } from "./utils/quick-transform";
import { lowercase } from "./transformations/lowercase";

export default async function Command() {
  await quickTransform(lowercase);
}
