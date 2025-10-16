import React, { ReactNode, useEffect, useState } from "react";
import { HistoryEntry, SearchResult } from "../types/interfaces";
import { validateAppIsInstalled } from "../actions";
import { NotInstalledError, UnknownError } from "../components";
import { geNotInstalledMessage } from "../utils/messageUtils";

export function useIsAppInstalled(): SearchResult<HistoryEntry> {
  const [errorView, setErrorView] = useState<ReactNode | undefined>();

  useEffect(() => {
    async function checkIfAppIsInstalled() {
      try {
        await validateAppIsInstalled();
      } catch (error: unknown) {
        if (error instanceof Error && error.message === geNotInstalledMessage()) {
          setErrorView(<NotInstalledError />);
        } else {
          setErrorView(<UnknownError />);
        }
      }
    }
    checkIfAppIsInstalled();
  }, []);

  return { errorView, data: [], isLoading: false };
}
