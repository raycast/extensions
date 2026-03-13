import { captureException } from "@raycast/api";
import { showStickies } from "./utils/stickies-utils";

export default async () => {
  try {
    await showStickies(true);
  } catch (e) {
    captureException(e);
  }
};
