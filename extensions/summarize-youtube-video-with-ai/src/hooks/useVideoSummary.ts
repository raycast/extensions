import { getPreferenceValues } from "@raycast/api";
import getVideoTranscript from "../utils/getVideoTranscript";
import useChatGPTSummary from "./useChatGPTSummary";
import useRaycastAISummary from "./useRaycastAISummary";
import { useEffect, useState } from "react";

interface VideoSummaryProps {
  video: string;
  setSummaryIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
}

const useVideoSummary = ({ video, setSummaryIsLoading, setSummary }: VideoSummaryProps) => {
  const preferences = getPreferenceValues();
  const [transcript, setTranscript] = useState<string | null>(null);

  useEffect(() => {
    const fetchTranscript = async () => {
      const transcript = await getVideoTranscript(video);
      setTranscript(transcript);
    };

    fetchTranscript();
  }, [video]);

  useEffect(() => {
    if (transcript) {
      if (preferences.chosenAi === "chatgpt") {
        useChatGPTSummary({ transcript, setSummaryIsLoading, setSummary });
      }
      if (preferences.chosenAi === "raycastai") {
        useRaycastAISummary({ transcript, setSummaryIsLoading, setSummary });
      }
    }
  }, [preferences.chosenAi, transcript, setSummaryIsLoading, setSummary]);

  return null;
};

export default useVideoSummary;
