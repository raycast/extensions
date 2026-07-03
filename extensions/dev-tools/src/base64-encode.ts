import { transformClipboard } from "./lib/codec-clipboard";

export default async function Command() {
  await transformClipboard("base64", "encode");
}
