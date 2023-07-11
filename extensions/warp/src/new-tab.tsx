import { newTab, openUri } from "./uri";

export default async function Command() {
  await openUri(newTab("~"));
}
