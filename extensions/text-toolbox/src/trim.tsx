import { quickTransform } from "./utils/quick-transform";
import { trim } from "./transformations/trim";

export default async function Command() {
  await quickTransform(trim);
}
