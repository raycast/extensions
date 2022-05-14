import { postAndCloseMainWindow } from "./utilities/fetch";

export default async function main() {
  await postAndCloseMainWindow("toggle-anydock");
}
