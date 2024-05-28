import { useRef, useState } from "react";
import { showFailureToast } from "@raycast/utils";

import { corcelClient } from "../lib/corcel-client";
import { Exchange, Model } from "../lib/chat";

export const useSendLastMessage = (exchanges: Exchange[]) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const cancelledRef = useRef(false);
  const [systemResponse, setSystemResponse] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const streamMessage = async (model: Model) => {
    try {
      cancelledRef.current = false;
      setIsStreaming(true);
      setErrorMessage("");

      const response = await corcelClient.chat.sendMessage(exchanges, model);

      const reader = response?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (!reader) {
        return response;
      }

      while (!cancelledRef.current) {
        const { value, done: doneReading } = await reader.read();
        if (doneReading) {
          setIsStreaming(false);
          break;
        }
        const chunkValue = decoder.decode(value);

        if (chunkValue.includes("[/INST]")) {
          setSystemResponse((res) => res + chunkValue.replace("[/INST]", ""));
          setIsStreaming(false);
          break;
        }

        setSystemResponse((res) => res + chunkValue);

        await new Promise((resolve) => setTimeout(resolve, 96));
      }

      setIsStreaming(false);

      return response;
    } catch (error) {
      // TODO - Remove variable re-assignment and better error handling
      setIsStreaming(false);
      const errorOject = error as Error;
      setErrorMessage(errorOject.message || "error");
      showFailureToast(errorOject.message, { title: "Error:" });
      throw errorOject;
    }
  };

  const cancelStream = () => {
    cancelledRef.current = true;
  };

  return {
    streamMessage,
    cancelStream,
    isStreaming,
    systemResponse,
    errorMessage,
  };
};
