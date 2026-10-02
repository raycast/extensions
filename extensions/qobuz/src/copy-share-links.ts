import { Clipboard, showHUD, showToast, Toast, type LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { linkFailureTitle, noMatchTitle, openQobuzSearch, resolveCopyTrack } from "./lib/resolve-copy";
import { countServices, shareClipboard, shareTitle } from "./lib/share";

export default async function Command(props: LaunchProps<{ arguments: Arguments.CopyShareLinks }>) {
  try {
    const resolved = await resolveCopyTrack(props.arguments.link?.trim() ?? "");

    if (!resolved.ok) {
      if (resolved.reason === "nothing-playing") {
        await showToast({ style: Toast.Style.Failure, title: "Nothing playing in Qobuz" });
        return;
      }
      if (resolved.reason === "link") {
        await showToast({ style: Toast.Style.Failure, title: linkFailureTitle(resolved.failure) });
        return;
      }
      await showToast({
        style: Toast.Style.Failure,
        title: noMatchTitle(resolved.artist, resolved.title),
        primaryAction: {
          title: "Search on Qobuz",
          onAction: () => openQobuzSearch(resolved.artist, resolved.title),
        },
      });
      return;
    }

    await Clipboard.copy(shareClipboard(resolved.track, resolved.links));
    const suffix = resolved.approximate ? " (approximate match)" : "";
    await showHUD(`Copied ${countServices(resolved.links)} links for ${shareTitle(resolved.track)}${suffix}`);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't copy share links" });
  }
}
