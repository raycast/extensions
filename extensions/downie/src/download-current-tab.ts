import { LaunchProps, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { currentTabUrl } from "./browser";
import { sendLinks } from "./downie";
import { Postprocessing } from "./urls";

export default async function Command(props: LaunchProps<{ arguments: Arguments.DownloadCurrentTab }>) {
  const format = (props.arguments.format || "default") as Postprocessing;
  try {
    const { url, browser } = await currentTabUrl();
    await sendLinks([url], { postprocessing: ["audio", "mp4"].includes(format) ? format : "default" });
    const label = format === "audio" ? "audio" : format === "mp4" ? "MP4" : "video";
    await showHUD(`⬇︎ Sent ${label} from ${browser} to Downie`);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't send tab to Downie" });
  }
}
