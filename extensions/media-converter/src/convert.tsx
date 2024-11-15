import { useState, useEffect } from "react";
import { Detail } from "@raycast/api";
import { LocalStorage } from "@raycast/api";
import { isFFmpegInstalled } from "./utils/ffmpeg";
import { HelloPage } from "./components/HelloPage";
import { NotInstalled } from "./components/NotInstalled";
import { ConverterForm } from "./components/ConverterForm";

export default function Command() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [hasSeenHelloPage, setHasSeenHelloPage] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check FFmpeg installation status periodically
  useEffect(() => {
    const checkFFmpeg = async () => {
      try {
        const installed = await isFFmpegInstalled();
        setIsInstalled(installed);
      } catch (error) {
        console.error("Error checking FFmpeg:", error);
        setIsInstalled(false);
      }
    };

    // Initial check
    checkFFmpeg();

    // Set up periodic checks
    const interval = setInterval(checkFFmpeg, 1000); // Check every second

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  // Load hello page status only once
  useEffect(() => {
    async function loadHelloPageStatus() {
      try {
        const seen = await LocalStorage.getItem("hasSeenHelloPage");
        setHasSeenHelloPage(seen === "true");
      } finally {
        setIsLoading(false);
      }
    }
    loadHelloPageStatus();
  }, []);

  if (isLoading) {
    return <Detail markdown="Checking FFmpeg installation..." />;
  }

  if (!isInstalled) {
    return <NotInstalled onRefresh={() => setIsInstalled(true)} />;
  }

  if (!hasSeenHelloPage) {
    return <HelloPage onContinue={() => setHasSeenHelloPage(true)} />;
  }

  return <ConverterForm />;
}
