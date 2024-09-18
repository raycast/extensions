import { appendedText } from "./utils/common-util";
import { closeMainWindow } from "@raycast/api";

export default async () => {
  await closeMainWindow();
  await appendedText(false);
};
