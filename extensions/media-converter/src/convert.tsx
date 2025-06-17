import { useState, useEffect } from "react";
import { /* Detail,*/ /* environment, */ LocalStorage, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import fs from "fs";
import { findFFmpegPath } from "./utils/ffmpeg";
import { HelloPage } from "./components/HelloPage";
import { Installation } from "./components/Installation";
import { ConverterForm } from "./components/ConverterForm";

export default function Command() {
  const [hasSeenHelloPage, setHasSeenHelloPage] = useState<boolean | null>(null);
  const [initialFinderFiles, setInitialFinderFiles] = useState<string[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [showInstallation, setShowInstallation] = useState(false);
  const [ffmpegLostMessage, setFFmpegLostMessage] = useState<string | null>(null);

  // Check FFmpeg installation in the background
  useEffect(() => {
    const checkFFmpeg = async () => {
      try {
        // First check if we have a stored path
        const storedPath = await LocalStorage.getItem("ffmpeg-path");

        if (storedPath && typeof storedPath === "string") {
          // Check if the stored binary still exists
          if (!fs.existsSync(storedPath)) {
            // Stored binary no longer exists
            await LocalStorage.removeItem("ffmpeg-path");
            setFFmpegLostMessage(`We couldn't find FFmpeg at the previously configured path: ${storedPath}`);
            await showToast({
              style: Toast.Style.Failure,
              title: "FFmpeg not found",
              message: "The previously configured FFmpeg binary is no longer available",
            });
            setShowInstallation(true);
            return;
          }
          // Binary exists, we're good to go
          return;
        }

        // No stored path, check for system FFmpeg
        const foundPath = await findFFmpegPath();
        // FFmpeg found on system - determine if we should show success toast
        const hasSeenHelloPageBefore = await LocalStorage.getItem("hasSeenHelloPage");
        const isFirstTimeSetup = hasSeenHelloPageBefore;

        if (!foundPath) {
          // No FFmpeg found anywhere - check if this is first-time setup

          // Only show failure toast if this isn't the first time setup
          if (!isFirstTimeSetup) {
            await showToast({
              style: Toast.Style.Failure,
              title: "FFmpeg required",
              message: "FFmpeg is required for media conversion. Please install it.",
            });
          }
          setShowInstallation(true);
        } else {
          const hadLostFFmpeg = ffmpegLostMessage !== null;

          // Show success toast if:
          // 1. First time setup and FFmpeg was found, OR
          // 2. Previously had FFmpeg that was lost, but system FFmpeg was found
          if (isFirstTimeSetup || hadLostFFmpeg) {
            await showToast({
              style: Toast.Style.Success,
              title: "FFmpeg found",
              message: `FFmpeg detected at: ${foundPath}`,
            });
          }

          // Store the found path for future use
          await LocalStorage.setItem("ffmpeg-path", foundPath);
        }
      } catch (error) {
        console.error("Error checking FFmpeg:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "FFmpeg check failed",
          message: "Could not verify FFmpeg installation",
        });
        setShowInstallation(true);
      }
    };

    // Only check FFmpeg after initial data is loaded
    if (!isLoading && hasSeenHelloPage) {
      checkFFmpeg();
    }
  }, [isLoading, hasSeenHelloPage]);

  // Load hello page status and selected Finder items
  useEffect(() => {
    async function loadInitialData() {
      try {
        const seen = await LocalStorage.getItem("hasSeenHelloPage");
        setHasSeenHelloPage(seen === "true");
        // setHasSeenHelloPage(seen === !environment.isDevelopment); // In dev mode, always show the HelloPage

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
      } finally {
        setIsLoading(false); // Always stop loading after this effect
      }
    }
    loadInitialData();
  }, []);

  // Show HelloPage first on initial load (only if we know they haven't seen it)
  if (hasSeenHelloPage === false) {
    return <HelloPage onContinue={() => setHasSeenHelloPage(true)} />;
  }

  // Show installation if we've determined FFmpeg is missing
  if (showInstallation) {
    return <Installation onInstallComplete={() => setShowInstallation(false)} lostFFmpegMessage={ffmpegLostMessage} />;
  }

  // Show loading only while we're still loading initial data
  /* if (isLoading || hasSeenHelloPage === null) {
    return <Detail markdown="Loading..." />;
  } */

  // Default to ConverterForm (FFmpeg check happens in background)
  return <ConverterForm initialFiles={initialFinderFiles} />;
}
