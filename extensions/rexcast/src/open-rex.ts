import { closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { openRex } from "./lib/rex";

export default async () => {
  await closeMainWindow();
  try {
    await openRex();
  } catch (e) {
    await showFailureToast(e, { title: "Could not open Rex" });
  }
};
