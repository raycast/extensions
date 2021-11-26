import { closeMainWindow, copyTextToClipboard } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";

export default async () => {
    await closeMainWindow();
    await copyTextToClipboard(uuidv4());
}
