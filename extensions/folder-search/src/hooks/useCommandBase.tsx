import { useEffect, useRef } from "react";
import { LaunchProps } from "@raycast/api";

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
      console.debug(`[FolderSearch] Processing fallback text:`, {
        fallbackText: launchProps.fallbackText,
        component: commandName,
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
      console.debug(`[FolderSearch] Command launched:`, {
        launchType: launchProps.launchType,
        fallbackText: launchProps.fallbackText,
        searchText,
        component: commandName,
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