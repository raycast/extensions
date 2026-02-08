import { quickTransform } from "./utils/quick-transform";
import { sha256 } from "./transformations/sha256";

export default async function Command() {
  await quickTransform(sha256);
}
