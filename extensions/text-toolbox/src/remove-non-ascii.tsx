import { quickTransform } from "./utils/quick-transform";
import { removeNonAscii } from "./transformations/remove-non-ascii";

export default async function Command() {
  await quickTransform(removeNonAscii);
}
