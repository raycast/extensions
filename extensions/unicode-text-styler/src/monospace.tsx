import { quickConvert } from "./lib/quickConvert";

export default async function Command() {
  await quickConvert("monospace", "Monospace");
}
