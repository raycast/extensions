import { Clipboard, LaunchProps, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { spongecase } from "./lib/spongecase";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Spongecase }>) {
  try {
    const result = spongecase(props.arguments.text);
    await Clipboard.copy(result);
    await showHUD(result);
  } catch (err) {
    await showFailureToast(err, { title: "Sorry! Could not spongecase that text" });
  }
}
