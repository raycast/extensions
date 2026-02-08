import { quickTransform } from "./utils/quick-transform";
import { md5 } from "./transformations/md5";

export default async function Command() {
  await quickTransform(md5);
}
