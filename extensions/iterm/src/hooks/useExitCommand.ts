import React from "react";
import { closeMainWindow, popToRoot } from "@raycast/api";

export const useExitCommand = (complete: boolean) => {
  React.useEffect(() => {
    if (complete) {
      closeMainWindow().then(() => popToRoot());
    }
  }, [complete]);
};
