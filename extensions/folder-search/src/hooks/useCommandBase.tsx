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
  // Log launch type for debugging
  const hasLoggedLaunchRef = useRef<boolean>(false);

  useEffect(() => {
    if (!hasLoggedLaunchRef.current) {
      log("debug", commandName, "Command launched", {
        launchType: launchProps.launchType,
        searchText,
        timestamp: new Date().toISOString(),
      });
      hasLoggedLaunchRef.current = true;
    }
  }, [launchProps.launchType, searchText, commandName]);

  return {
    hasLoggedLaunchRef,
  };
}
