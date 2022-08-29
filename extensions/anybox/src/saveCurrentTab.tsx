import { postAndCloseMainWindow } from "./utilities/fetch";

export default async function main() {
  // Optional parameters to paste with collections and starred status.
  // { "starred": true, "collections": [ "identifier1", "identifier2" ] }
  await postAndCloseMainWindow("save-current-tab");
}
