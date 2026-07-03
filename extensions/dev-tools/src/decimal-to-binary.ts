import { convertClipboard } from "./lib/convert-clipboard";

export default async function Command() {
  await convertClipboard("decimal", "binary");
}
