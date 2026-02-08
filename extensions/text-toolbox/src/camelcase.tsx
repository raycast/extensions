import { quickTransform } from "./utils/quick-transform";
import { camelcase } from "./transformations/camelcase";

export default async function Command() {
  await quickTransform(camelcase);
}
