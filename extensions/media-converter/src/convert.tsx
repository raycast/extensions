import { useState, useEffect } from "react";
import { /* Detail,*/ /* environment, */ LocalStorage, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fs from "fs";
import { HelloPage } from "./components/HelloPage";
import { FFmpegInstallPage } from "./components/FFmpegInstallPage";
import { ConverterForm } from "./components/ConverterForm";
import { findFFmpegPath } from "./utils/ffmpeg";

export default function Command() {
  // For some reason, limiting this to boolean only (and setting it to falce) will show HelloPage.tsx during loading, so that's a no no... There's probably an easy workaround though
  const [hasSeenHelloPage, setHasSeenHelloPage] = useState<boolean | null>(null);
  const [initialFinderFiles, setInitialFinderFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInstallation, setShowInstallation] = useState(false);
  // ffmpegLostMessage has to be string or null because empty string could be given as ffmpegLostMessage, theorically
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
            showFailureToast(new Error("The previously configured FFmpeg binary is no longer available"), {
              title: "FFmpeg not found",
            });
            setShowInstallation(true);
            return;
          }
          // Binary exists, we're good to go
          return;
        }

        // No stored path - check if we can find FFmpeg on the system
        // If user has seen hello page but we have no stored path, we should try to find it
        const ffmpegInfo = await findFFmpegPath();
        if (!ffmpegInfo) {
          // No FFmpeg found anywhere, show installation page
          setShowInstallation(true);
          return;
        }
        // FFmpeg was found and stored, notify the user
        showToast({
          style: Toast.Style.Success,
          title: "FFmpeg found",
          message: `FFmpeg v${ffmpegInfo.version} detected at: ${ffmpegInfo.path}`,
        });
      } catch (error) {
        console.error("Error checking FFmpeg:", error);
      }
    };

    // Only check FFmpeg after initial data is loaded and user has seen HelloPage
    if (!isLoading && hasSeenHelloPage) {
      checkFFmpeg();
    }
  }, [isLoading, hasSeenHelloPage]);

  // Load hello page status and selected Finder items
  useEffect(() => {
    async function loadInitialData() {
      try {
        const seen = /* environment.isDevelopment ? false : */ await LocalStorage.getItem("hasSeenHelloPage");
        setHasSeenHelloPage(seen === "true");

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

  if (hasSeenHelloPage === false) {
    return (
      <HelloPage
        onContinue={() => setHasSeenHelloPage(true)}
        onChooseToSetCustomFFmpegPath={() => {
          setHasSeenHelloPage(true);
          setShowInstallation(true);
        }}
      />
    );
  }

  // Show installation if we've determined FFmpeg is missing
  // or if the user has chosen to set a custom path
  if (showInstallation) {
    return (
      <FFmpegInstallPage onInstallComplete={() => setShowInstallation(false)} lostFFmpegMessage={ffmpegLostMessage} />
    );
  }

  // Show loading only while we're still loading initial data
  /* if (isLoading || hasSeenHelloPage === null) {
    return <Detail markdown="Loading..." />;
  } */
  // Disabled to make the UI more responsive, it still loads in the background

  // Default to ConverterForm (FFmpeg check happens in background)
  return <ConverterForm initialFiles={initialFinderFiles} />;
}
