import { closeMainWindow } from "@raycast/api";
import * as playerControls from "./util/controls";

export default async () => {
  await closeMainWindow();
  await playerControls.dislike();
};
