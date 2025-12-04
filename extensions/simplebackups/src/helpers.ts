import { useEffect, useRef, useState } from "react";
import { environment, getPreferenceValues, Icon } from "@raycast/api";
import { BackupState } from "./types";

export const useIsMounted = () => {
  const isMounted = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  });
  return isMounted;
};

export const requestHeaders = () => {
  return {
    Authorization: `Bearer ${getPreferenceValues()?.sb_api_token}`,
    "Content-Type": "application/json",
    "X-App": "raycast",
    "X-App-Version": environment.raycastVersion,
    "X-App-Extension-Version": "0.1.1",
    Accept: "application/json",
  };
};

export const backupStateIcon = (state?: BackupState, status?: boolean) => {
  if (!status) {
    return { source: Icon.Pause };
  }

  switch (state) {
    case "success":
      return { source: Icon.Dot, tintColor: "#29DCC0" };
    case "initiated":
      return { source: Icon.CircleProgress25, tintColor: "#6267ED" };
    case "running":
      return { source: Icon.CircleProgress75, tintColor: "#6267ED" };
    case "error":
      return { source: Icon.Dot, tintColor: "#ff3860" };
    default:
      return { source: Icon.Dot };
  }
};
