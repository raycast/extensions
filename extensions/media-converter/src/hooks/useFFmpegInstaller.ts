import { useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { installFFmpegBinary } from "../utils/ffmpeg";

export function useFFmpegInstaller() {
  const [isInstalling, setIsInstalling] = useState(false);

  const installFFmpeg = async (): Promise<boolean> => {
    setIsInstalling(true);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Installing FFmpeg...",
      message: "0%",
    });

    try {
      await installFFmpegBinary((progress) => {
        // Update toast message with progress percentage
        toast.message = `${progress}%`;
      });

      await toast.hide();
      await showToast({
        style: Toast.Style.Success,
        title: "FFmpeg installed successfully",
        message: "FFmpeg has been successfully installed",
      });

      return true;
    } catch (error) {
      await toast.hide();
      console.error("Auto-install error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to install FFmpeg",
        message: `Error: ${String(error)}`,
      });

      return false;
    } finally {
      setIsInstalling(false);
    }
  };

  return {
    isInstalling,
    installFFmpeg,
  };
}
