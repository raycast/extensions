import { useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import type { FormValues } from "../types";
import { inspectMedia, estimateVideoBytes, formatSize, type MediaInfo } from "../utils/mediaInfo";
import { estimateGifBytes } from "../utils/gifski";

export function useOutputEstimate(values: FormValues | null, enabled: boolean) {
  const [media, setMedia] = useState<{ key: string; items: MediaInfo[] }>({ key: "", items: [] });
  const [metadataError, setMetadataError] = useState("");
  const [estimate, setEstimate] = useState("Choose a video to estimate output size");
  const filesKey = JSON.stringify(values?.videoFiles || []);
  const isGif = values?.videoFormat === "gif";
  // Only settings that affect output size trigger background work.
  const settingsKey = JSON.stringify(
    isGif
      ? [values?.gifQuality, values?.gifFps]
      : [
          values?.compressionMode,
          values?.bitrate,
          values?.maxSize,
          values?.audioBitrate,
          values?.removeAudio,
          values?.audioFiles,
        ],
  );

  useEffect(() => {
    const controller = new AbortController();
    setMetadataError("");
    if (!enabled) return () => controller.abort();
    const files: string[] = JSON.parse(filesKey);
    Promise.all(files.map((file) => inspectMedia(file, controller.signal)))
      .then((items) => {
        if (!controller.signal.aborted) setMedia({ key: filesKey, items });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setMetadataError(error.message);
      });
    return () => controller.abort();
  }, [filesKey, enabled]);

  useEffect(() => {
    const controller = new AbortController();
    if (!enabled) return () => controller.abort();
    const files: string[] = JSON.parse(filesKey);
    if (!files.length) {
      setEstimate("Choose a video to estimate output size");
      return;
    }
    if (metadataError) {
      setEstimate(`Unavailable: ${metadataError}`);
      return;
    }
    setEstimate("Estimating…");
    if (media.key !== filesKey || !values) return;
    const timer = setTimeout(
      async () => {
        try {
          let total = 0;
          for (const [index, file] of files.entries()) {
            controller.signal.throwIfAborted();
            total += isGif
              ? await estimateGifBytes(file, media.items[index], values.gifQuality, values.gifFps, controller.signal)
              : estimateVideoBytes(values, media.items[index]);
          }
          if (!controller.signal.aborted)
            setEstimate(`≈ ${formatSize(total)}${files.length > 1 ? ` total (${files.length} files)` : ""}`);
        } catch (error) {
          if (!controller.signal.aborted)
            setEstimate(`Unavailable: ${error instanceof Error ? error.message : "Could not estimate size"}`);
        }
      },
      isGif ? 700 : 100,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // values is captured with the size-relevant settings above; rename/output-folder changes need no re-encode.
  }, [filesKey, settingsKey, isGif, media, metadataError, enabled]);

  const hasFiles = filesKey !== "[]";

  useEffect(() => {
    if (!enabled || !hasFiles) return;
    let active = true;
    let toast: Toast | undefined;
    const calculating = estimate === "Estimating…" || estimate === "Choose a video to estimate output size";
    const failed = estimate.startsWith("Unavailable:");
    // Pass the complete state in one call: native clients can retain the animated
    // icon when an existing toast's properties are changed individually.
    void showToast({
      style: calculating ? Toast.Style.Animated : failed ? Toast.Style.Failure : Toast.Style.Success,
      title: calculating ? "Estimating Size…" : failed ? "Size Unavailable" : "Estimated Size",
      message: calculating ? undefined : failed ? estimate.slice("Unavailable: ".length) : estimate,
    })
      .then((shown) => {
        if (active) toast = shown;
        else void shown.hide();
      })
      .catch(console.error);
    return () => {
      active = false;
      void toast?.hide();
    };
  }, [estimate, enabled, hasFiles]);

  return {
    estimate,
    sourceFps:
      media.key === filesKey && media.items[0]?.fps ? String(Number(Math.min(media.items[0].fps, 100).toFixed(3))) : "",
  };
}
