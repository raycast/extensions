import { useEffect, useRef } from "react";
import { LaunchProps } from "@raycast/api";
import { log } from "../utils";

interface CommandBaseProps {
  commandName: string;
  launchProps: LaunchProps;
  searchText: string;
  setSearchText: (text: string) => void;
}

export function useCommandBase({ commandName, launchProps, searchText, setSearchText }: CommandBaseProps) {
  // Handle fallback text from root search
  const fallbackTextRef = useRef<string | undefined>(undefined);
  const fallbackTextProcessedRef = useRef<boolean>(false);

  useEffect(() => {
    // Only process fallbackText once per session
    if (launchProps.fallbackText && !fallbackTextProcessedRef.current) {
      log("debug", commandName, "Processing fallback text", {
        fallbackText: launchProps.fallbackText,
        timestamp: new Date().toISOString(),
      });

      fallbackTextRef.current = launchProps.fallbackText;
      fallbackTextProcessedRef.current = true;
      setSearchText(launchProps.fallbackText);
    }
  }, [launchProps.fallbackText, commandName, setSearchText]);

  // Log launch type for debugging
  const hasLoggedLaunchRef = useRef<boolean>(false);

  useEffect(() => {
    if (!hasLoggedLaunchRef.current) {
      log("debug", commandName, "Command launched", {
        launchType: launchProps.launchType,
        fallbackText: launchProps.fallbackText,
        searchText,
        timestamp: new Date().toISOString(),
      });
      hasLoggedLaunchRef.current = true;
    }
  }, [launchProps.launchType, launchProps.fallbackText, searchText, commandName]);

  return {
    fallbackTextRef,
    fallbackTextProcessedRef,
    hasLoggedLaunchRef,
  };
}
