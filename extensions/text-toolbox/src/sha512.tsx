import { quickTransform } from "./utils/quick-transform";
import { sha512 } from "./transformations/sha512";

export default async function Command() {
  await quickTransform(sha512);
}
