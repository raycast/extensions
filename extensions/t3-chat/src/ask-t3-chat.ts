import { LaunchProps, open } from "@raycast/api";
import { getPrefs } from "../lib/prefs";

export default function Command(props: LaunchProps<{ arguments: Arguments.AskT3Chat }>) {
  open(
    `https://t3.chat/new?q=${encodeURIComponent(props.arguments.query ?? props.fallbackText ?? "")}&model=${encodeURIComponent(getPrefs().model)}`,
  );
}
