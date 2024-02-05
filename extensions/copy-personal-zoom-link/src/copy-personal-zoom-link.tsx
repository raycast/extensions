
import { Clipboard, closeMainWindow } from "@raycast/api";

export default async function Command() {
    await closeMainWindow();
    await Clipboard.copy("https://ab-inbev.zoom.us/my/louiskraemer");
}
