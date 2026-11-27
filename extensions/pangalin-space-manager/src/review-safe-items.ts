import { openInSpaceManager } from "./app";
import { links } from "./links";

// Only opens the review in Space Manager. Nothing is removed from here;
// the user checks the list and confirms in the app.
export default async function Command() {
  await openInSpaceManager(links.reviewSafe);
}
