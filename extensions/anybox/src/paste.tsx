import { postAndCloseMainWindow } from "./utilities/fetch";

export default async function main() {
  // Optional parameters to paste with tags and starred status.
  // { "starred": true, "tags": [ "identifier1", "identifier2" ] }
  await postAndCloseMainWindow("paste");
}
