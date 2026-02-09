import fs from "fs/promises";
import { getTitleAnimationCycleMs, renderCountdownBase64 } from "./render";
import { formatRemaining, getRemainingMinutes } from "./update";
import { getProgressRatio } from "./progress";

const DEFAULT_REFRESH_MS = 10_000;

type RefreshOptions = {
  previewPath: string;
  endEpochMs: number;
  startEpochMs: number;
  title?: string;
  refreshMs?: number;
};

export async function startPreviewAutoRefresh(
  options: RefreshOptions
): Promise<void> {
  const baseRefreshMs = options.refreshMs ?? DEFAULT_REFRESH_MS;
  const animationCycleMs = getTitleAnimationCycleMs(options.title);
  const refreshMs = Math.max(baseRefreshMs, animationCycleMs ?? 0);
  let inFlight = false;

  const updatePreview = async (): Promise<number> => {
    const nowMs = Date.now();
    const remaining = getRemainingMinutes(options.endEpochMs, nowMs);
    const totalMinutes = Math.max(
      0,
      Math.ceil((options.endEpochMs - options.startEpochMs) / 60_000)
    );
    const text = formatRemaining(remaining, totalMinutes);
    const progress = getProgressRatio(
      options.startEpochMs,
      options.endEpochMs,
      nowMs
    );
    const base64 = await renderCountdownBase64({
      text,
      progress,
      title: options.title,
      nowMs,
      startEpochMs: options.startEpochMs,
    });
    await fs.writeFile(options.previewPath, buildHtml(base64, refreshMs), {
      encoding: "utf8",
    });
    return remaining;
  };

  const remaining = await updatePreview();
  if (remaining === 0) return;

  const interval = setInterval(async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      const nextRemaining = await updatePreview();
      if (nextRemaining === 0) {
        clearInterval(interval);
      }
    } catch (error) {
      console.error("Failed to refresh preview", error);
    } finally {
      inFlight = false;
    }
  }, refreshMs);
}

function buildHtml(base64: string, refreshMs: number): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <title>Tidbyt Preview</title>
    <style>
      body {
        margin: 0;
        padding: 24px;
        background: #111;
        color: #fff;
        font-family: system-ui, -apple-system, Segoe UI, sans-serif;
      }
      .frame {
        width: 256px;
        height: 128px;
        border: 1px solid #333;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #000;
      }
      img {
        width: 256px;
        height: 128px;
        image-rendering: pixelated;
      }
    </style>
  </head>
  <body>
    <div class="frame">
      <img src="data:image/webp;base64,${base64}" alt="Tidbyt Preview" />
    </div>
    <script>
      window.setTimeout(() => {
        window.location.reload();
      }, ${refreshMs});
    </script>
  </body>
</html>`;
}
