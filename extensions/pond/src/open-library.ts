import { closeMainWindow, open } from "@raycast/api";
import { toError } from "./api/problems";
import { showFailure } from "./components/problem";
import { LIBRARY_LINK } from "./lib/links";

export default async function Command() {
  try {
    await closeMainWindow();
    await open(LIBRARY_LINK);
  } catch (error) {
    await showFailure(toError(error), "Couldn't open Pond");
  }
}
