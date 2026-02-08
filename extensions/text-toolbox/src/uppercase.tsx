import { quickTransform } from "./utils/quick-transform";
import { uppercase } from "./transformations/uppercase";

export default async function Command() {
  await quickTransform(uppercase);
}
