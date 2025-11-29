import { showToast, Toast, LocalStorage, Detail } from "@raycast/api";
import { getAllAudioDevices } from "./utils/audioDeviceCmdlets";
import { useEffect, useState } from "react";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<string>("");

  useEffect(() => {
    async function refreshDevices() {
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Refreshing audio devices...",
        });

        const devices = await getAllAudioDevices();

        if (!devices.length) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No devices found",
            message: "Please check your audio drivers",
          });
          setResult("No audio devices found. Please check your audio drivers.");
          return;
        }

        // Save to Raycast LocalStorage
        await LocalStorage.setItem("audio-devices", JSON.stringify(devices));

        const playback = devices.filter((d) => d.Type === "Playback").length;
        const recording = devices.filter((d) => d.Type === "Recording").length;

        await showToast({
          style: Toast.Style.Success,
          title: "Audio devices saved",
          message: `Found ${playback} playback and ${recording} recording.`,
        });

        setResult(
          `Successfully scanned and saved audio devices:\n\n${playback} playback devices\n${recording} recording devices\n\nTotal: ${devices.length} devices`,
        );
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to scan devices",
          message: error instanceof Error ? error.message : String(error),
        });
        setResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoading(false);
      }
    }

    refreshDevices();
  }, []);

  return <Detail isLoading={isLoading} markdown={result || "Scanning for audio devices..."} actions={[]} />;
}
