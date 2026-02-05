import { useState, useEffect, useRef } from "react";
import { loadVessloData } from "./data";
import { VessloData } from "../types";
import { showToast, Toast } from "@raycast/api";

const REFRESH_INTERVAL = 3000; // 3 seconds

export function useVessloData() {
  const [data, setData] = useState<VessloData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastExportedAt = useRef<string | null>(null);

  useEffect(() => {
    // Initial load
    const initialData = loadVessloData();
    setData(initialData);
    setIsLoading(false);
    lastExportedAt.current = initialData?.exportedAt ?? null;

    if (!initialData) {
      showToast({
        style: Toast.Style.Failure,
        title: "Vesslo data not found",
        message: "Please run Vesslo app first",
      });
    }

    // Polling for updates
    const interval = setInterval(() => {
      const newData = loadVessloData();
      if (!newData) return;

      // Compare exportedAt timestamp to detect changes
      if (newData.exportedAt !== lastExportedAt.current) {
        lastExportedAt.current = newData.exportedAt;
        setData(newData);
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []); // Empty dependency array - run only once

  return { data, isLoading, setData };
}
