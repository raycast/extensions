import { useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import type { TranscriptionStatus } from "../../store/types";

export const useTranscriptionToasts = (status: TranscriptionStatus, error: string | undefined) => {
  useEffect(() => {
    switch (status) {
      case "idle":
        void showToast(Toast.Style.Success, "Ready to Record", "Press Enter to start transcribing");
        break;
      case "recording":
        void showToast(Toast.Style.Animated, "Recording…", "Press Enter to stop, Cmd+Z to cancel");
        break;
      case "transcribing":
        void showToast(Toast.Style.Animated, "Transcribing…", "Uploading and processing audio");
        break;
      case "transcribing_success":
        void showToast(Toast.Style.Success, "Transcription Complete");
        break;
      case "transcribing_error":
        void showToast(Toast.Style.Failure, "Transcription Failed", error);
        break;
    }
  }, [status, error]);
};
