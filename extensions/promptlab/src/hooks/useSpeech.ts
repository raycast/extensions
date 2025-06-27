import { useEffect, useRef, useState } from "react";
import { CommandOptions } from "../lib/commands/types";
import { execScript } from "../lib/scripts";
import path from "path";
import { environment } from "@raycast/api";

export const useSpeech = (options: CommandOptions, isLoading: boolean, response: string) => {
  const [speaking, setSpeaking] = useState<boolean>(false);
  const [spokenResponse, setSpokenResponse] = useState<boolean>(false);
  const sendContent = useRef<(message: string) => void>(null);
  const stopSpeech = useRef<() => void>(null);
  const [restartSpeech, setRestartSpeech] = useState<boolean>(false);
  const startedLoading = useRef<boolean>(false);

  const startSpeaking = () => {
    setSpeaking(true);
    const scriptPath = path.resolve(environment.assetsPath, "scripts", "SpeechSynthesis.scpt");
    const { data, sendMessage } = execScript(scriptPath, [isLoading], "JavaScript");
    sendContent.current = sendMessage;
    stopSpeech.current = () => {
      sendMessage("$$stop$$");
      setSpeaking(false);
    };

    data.then(() => {
      setSpeaking(false);
      setSpokenResponse(true);
    });
  };

  useEffect(() => {
    if (options.speakResponse) {
      startSpeaking();
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !startedLoading.current && response != "Loading response...") {
      sendContent.current?.(`$$endData$$$$msg$$${response}`);
    } else if (response?.length > 0 && options.speakResponse && !spokenResponse) {
      sendContent.current?.(`$$msg$$${response}`);
    }
  }, [isLoading, response]);

  useEffect(() => {
    if (!speaking && restartSpeech) {
      startSpeaking();
      sendContent.current?.(`$$msg$$${response}`);
      setRestartSpeech(false);
    }
  }, [speaking, restartSpeech]);

  return { speaking, stopSpeech: stopSpeech.current, restartSpeech: () => setRestartSpeech(true) };
};
