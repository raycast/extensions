import { useState, useEffect, useRef } from "react";
import { WindowInfo } from "../types/index";
import { getActiveWindowInfo, WindowDetailsObject } from "../swift-app";
import { log, error as logError } from "../utils/logger";

/**
 * Hook for getting window information using Swift API
 * @returns Window information related states and methods
 */
export function useWindowInfo() {
  const [windowInfo, setWindowInfo] = useState<WindowInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  // Update mounted state when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  /**
   * Get current active window information
   */
  const getWindowDetails = async (): Promise<WindowInfo | null> => {
    // Only update state if component is mounted
    if (isMounted.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      // Get active window info directly from Swift API
      const result = await getActiveWindowInfo();

      // Handle different response types
      if (!result) {
        throw new Error("Failed to get window information");
      }

      // Handle string error response (legacy format)
      if (typeof result === "string" && result.startsWith("Error:")) {
        throw new Error(result);
      }

      // Handle object response
      if (typeof result === "object" && !Array.isArray(result)) {
        const details = result as WindowDetailsObject;

        // Handle error in object
        if (details.error) {
          if (details.message) {
            throw new Error(details.message);
          } else {
            throw new Error("Unknown error occurred");
          }
        }

        // Extract window information
        if (details.window) {
          const { position, size } = details.window;

          // Create window info object
          const info: WindowInfo = {
            x: position.x,
            y: position.y,
            width: size.width,
            height: size.height,
          };

          // Log window info regardless of component mount state
          if (details.app) {
            log(`Active window info: ${details.app.name}.${details.app.processID}`, info);
          } else {
            log("Active window info:", info);
          }

          // Only update state if component is still mounted
          if (isMounted.current) {
            setWindowInfo(info);
          }

          return info;
        }
      }

      throw new Error("Invalid window information format");
    } catch (err) {
      // Only update state if component is still mounted
      if (isMounted.current) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logError("Error getting window info:", errorMsg);
        setError(new Error(errorMsg));
      }
      return null;
    } finally {
      // Only update state if component is still mounted
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  return {
    windowInfo,
    isLoading,
    error,
    getWindowInfo: getWindowDetails,
    refreshWindowInfo: getWindowDetails,
  };
}
