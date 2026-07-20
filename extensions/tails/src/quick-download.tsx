import { Clipboard, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";

import { fetchMetadata, fetchStreams, handleApiError } from "./lib/api";
import { downloadAll } from "./lib/download";
import { isUrl, pickBestStreamVariant } from "./lib/format";
import { addToHistory } from "./lib/history";
import type { StreamFile } from "./lib/types";

export default async function QuickDownload(props: LaunchProps<{ arguments: { url: string } }>) {
  try {
    let url = props.arguments.url?.trim();

    if (!url) {
      const clipboard = await Clipboard.readText();
      if (clipboard && isUrl(clipboard.trim())) {
        url = clipboard.trim();
      }
    }

    if (!url || !isUrl(url)) {
      await showHUD("Copy a link first");
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Checking link…",
    });
    const metadata = await fetchMetadata(url);

    if (metadata.media.length === 0) {
      await showHUD("Nothing to download from that link");
      return;
    }

    const streams = await fetchStreams(url);

    const files: StreamFile[] = [];

    for (const media of streams.medias) {
      const best = pickBestStreamVariant(media.variants);
      if (best) files.push(...best.streams);
    }

    if (files.length === 0) {
      await showHUD("Nothing to download");
      return;
    }

    const result = await downloadAll(files);

    for (const path of result.paths) {
      addToHistory({
        url,
        filename: path.split(/[/\\]/).pop() ?? "file",
        downloadPath: path,
        platform: metadata.platform,
        status: "completed",
        thumbnailUrl: metadata.thumbnailUrl,
      });
    }

    if (result.failed > 0 && result.paths.length === 0) {
      await showHUD("Download didn't finish");
    }
  } catch (error) {
    await handleApiError(error);
    await showHUD("Download didn't finish");
  }
}
