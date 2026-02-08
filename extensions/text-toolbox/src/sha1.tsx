import { quickTransform } from "./utils/quick-transform";
import { sha1 } from "./transformations/sha1";

export default async function Command() {
  await quickTransform(sha1);
}
