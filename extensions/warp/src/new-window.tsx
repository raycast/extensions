import { newWindow, openUri } from "./uri";

export default async function Command() {
  await openUri(newWindow("~"));
}
