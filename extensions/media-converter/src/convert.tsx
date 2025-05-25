import { useState, useEffect } from "react";
import { Detail, LocalStorage, getSelectedFinderItems } from "@raycast/api";
import { isFFmpegInstalled } from "./utils/ffmpeg";
import { HelloPage } from "./components/HelloPage";
import { NotInstalled } from "./components/NotInstalled";
import { ConverterForm } from "./components/ConverterForm";

export default function Command() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [hasSeenHelloPage, setHasSeenHelloPage] = useState<boolean | null>(null);
  const [initialFinderFiles, setInitialFinderFiles] = useState<string[] | undefined>(undefined);
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

  // Load hello page status and selected Finder items
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true); // Ensure loading state is true at the start
      try {
        const seen = await LocalStorage.getItem("hasSeenHelloPage");
        setHasSeenHelloPage(seen === "true");
        /* setHasSeenHelloPage(seen === "false"); // DEV ONLY */

        try {
          const finderItems = await getSelectedFinderItems();
          setInitialFinderFiles(finderItems.map((item) => item.path));
        } catch (finderError) {
          // Non-fatal error: Finder might not be frontmost, or no selection.
          // Log it but proceed, allowing manual file addition.
          console.warn("Could not get selected Finder items:", finderError);
          setInitialFinderFiles([]); // Default to empty array
        }
      } catch (error) {
        console.error("Error loading initial data (localStorage):", error);
        // If localStorage fails, assume hello page hasn't been seen to be safe.
        if (hasSeenHelloPage === null) setHasSeenHelloPage(false);
        // If initialFinderFiles is still undefined (e.g., error before finder check), set to empty.
        if (initialFinderFiles === undefined) setInitialFinderFiles([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []); // Run once on mount

  if (isLoading || hasSeenHelloPage === null || isInstalled === null) {
    return <Detail markdown="Loading and checking FFmpeg installation..." />;
  }

  if (!isInstalled) {
    return <NotInstalled onRefresh={() => setIsInstalled(true)} />;
  }

  if (!hasSeenHelloPage) {
    return <HelloPage onContinue={() => setHasSeenHelloPage(true)} />;
  }

  return <ConverterForm initialFiles={initialFinderFiles} />; // Pass initialFiles to ConverterForm
}
