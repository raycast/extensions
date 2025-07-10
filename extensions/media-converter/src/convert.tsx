import { useState, useEffect } from "react";
import { LocalStorage, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { HelloPage } from "./components/HelloPage";
import { ConverterForm } from "./components/ConverterForm";
import { findFFmpegPath } from "./utils/ffmpeg";

export default function Command() {
  // For some reason, limiting this to boolean only (and setting it to false) will show HelloPage.tsx during loading, so that's a no no... There's probably an easy workaround though
  const [hasSeenHelloPage, setHasSeenHelloPage] = useState<boolean | null>(null);
  const [initialFinderFiles, setInitialFinderFiles] = useState<string[]>([]);
  const [ffmpegLostMessage, setFFmpegLostMessage] = useState<string | null>(null);

  // Load hello page status and selected Finder items
  useEffect(() => {
    async function loadInitialData() {
      try {
        const seen = await LocalStorage.getItem("hasSeenHelloPage");
        const hasSeenPage = seen === "true";
        setHasSeenHelloPage(hasSeenPage);

        // If user has seen hello page before, check if FFmpeg is still available
        if (hasSeenPage) {
          const storedFFmpegPath = await LocalStorage.getItem("ffmpeg-path");
          const wasFFmpegLostBefore = await LocalStorage.getItem("ffmpeg-was-lost");

          if (storedFFmpegPath) {
            // Check if the previously configured FFmpeg is still available
            const currentFFmpeg = await findFFmpegPath();
            if (!currentFFmpeg) {
              // FFmpeg was configured before but is now lost
              // Mark that FFmpeg was lost for future reference
              await LocalStorage.setItem("ffmpeg-was-lost", "true");

              // Determine the specific reason for the failure
              let detailedMessage = `FFmpeg was previously configured at "${storedFFmpegPath}" but is no longer available or valid.`;

              try {
                const fs = await import("fs");
                if (!fs.existsSync(storedFFmpegPath as string)) {
                  detailedMessage += " The file no longer exists at the specified path.";
                } else {
                  detailedMessage +=
                    " The file exists but is not a valid FFmpeg executable or has an unsupported version.";
                }
              } catch {
                detailedMessage += " Could not verify if the file still exists.";
              }

              detailedMessage += " Please reconfigure FFmpeg to continue.";

              setFFmpegLostMessage(detailedMessage);
              setHasSeenHelloPage(false); // Force showing HelloPage again
            } else if (wasFFmpegLostBefore === "true") {
              // FFmpeg was lost before but is now available again
              // Show success toast and clear the "lost" flag
              await LocalStorage.removeItem("ffmpeg-was-lost");
              await showToast({
                style: Toast.Style.Success,
                title: "FFmpeg found",
                message: `Using FFmpeg v${currentFFmpeg.version} at "${currentFFmpeg.path}"`,
              });
            }
          } else {
            // No stored FFmpeg path, but user has seen hello page before
            // Check if FFmpeg is now available (user installed it at a commonPath since)
            const currentFFmpeg = await findFFmpegPath();
            if (currentFFmpeg) {
              // FFmpeg was found! Show success toast
              await showToast({
                style: Toast.Style.Success,
                title: "FFmpeg found",
                message: `Using FFmpeg v${currentFFmpeg.version} at "${currentFFmpeg.path}"`,
              });
            }
          }
        }

        try {
          const finderItems = await getSelectedFinderItems();
          setInitialFinderFiles(finderItems.map((item) => item.path));
        } catch (finderError) {
          console.warn("Could not get selected Finder items:", finderError);
          setInitialFinderFiles([]);
        }
      } catch (error) {
        console.error("Error loading initial data (localStorage):", error);
        setHasSeenHelloPage(false);
        setInitialFinderFiles([]);
      }
    }
    loadInitialData();
  }, []);

  if (hasSeenHelloPage === false) {
    return <HelloPage onContinue={() => setHasSeenHelloPage(true)} lostFFmpegMessage={ffmpegLostMessage} />;
  }

  return <ConverterForm initialFiles={initialFinderFiles} />;
}
