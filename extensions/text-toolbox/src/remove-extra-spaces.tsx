import { quickTransform } from "./utils/quick-transform";
import { removeExtraSpaces } from "./transformations/remove-extra-spaces";

export default async function Command() {
  await quickTransform(removeExtraSpaces);
}
