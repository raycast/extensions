import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { useScreenInfo } from "../hooks/useScreenInfo";
import { getActiveWindowScreenInfo, getActiveWindowInfo } from "../swift-app";
import { log as logger, error as logError } from "../utils/logger";

interface ScreenInfo {
  screens: string[];
  activeWindow: {
    screenIndex: number;
    screenPosition: { x: number; y: number };
    windowPosition: { x: number; y: number };
    windowSize: { width: number; height: number };
  } | null;
}

export function ScreenInfoDetails() {
  const { getAllScreensInfo } = useScreenInfo();
  const [isLoading, setIsLoading] = useState(true);
  const [screenInfo, setScreenInfo] = useState<ScreenInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use a single effect for data fetching
  useEffect(() => {
    let isMounted = true;

    async function fetchScreenInfo() {
      if (!isMounted) return;

      try {
        // Get all screen information
        const screensList = await getAllScreensInfo();

        if (!isMounted) return;

        // Get active window info
        let activeWindowInfo = null;
        try {
          const windowDetails = await getActiveWindowInfo();
          logger("Window details:", windowDetails);

          if (windowDetails.error) {
            logger("No active window detected");
          } else {
            const rawWindowInfo = await getActiveWindowScreenInfo();
            logger("Active window info:", rawWindowInfo);

            // Parse the output
            const parts = rawWindowInfo.split(":");
            if (parts.length === 3) {
              const screenIndex = parseInt(parts[0]);
              const screenDimensions = parts[1].split(",");
              const windowDimensions = parts[2].split(",");

              if (screenDimensions.length === 4 && windowDimensions.length === 4) {
                const [screenX, screenY] = screenDimensions;
                const [windowX, windowY, windowWidth, windowHeight] = windowDimensions;

                activeWindowInfo = {
                  screenIndex,
                  screenPosition: {
                    x: parseInt(screenX),
                    y: parseInt(screenY),
                  },
                  windowPosition: {
                    x: parseInt(windowX),
                    y: parseInt(windowY),
                  },
                  windowSize: {
                    width: parseInt(windowWidth),
                    height: parseInt(windowHeight),
                  },
                };
              }
            } else {
              throw new Error(`Failed to parse active window info: ${rawWindowInfo}`);
            }
          }
        } catch (windowErr) {
          logError("Failed to get active window info:", windowErr);
        }

        if (!isMounted) return;

        setScreenInfo({
          screens: screensList,
          activeWindow: activeWindowInfo,
        });
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchScreenInfo();

    // Cleanup function to handle component unmounting
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once

  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView title="⚠️ Failed to load" description={error} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && screenInfo && (
        <>
          {screenInfo.screens.map((screen, index) => {
            // Parse screen info which is now in format: "index:x,y,width,height"
            const parts = screen.split(":");
            if (parts.length !== 2) return null;

            const screenIndex = parts[0];
            const dimensions = parts[1].split(",");
            if (dimensions.length !== 4) return null;

            const [x, y, width, height] = dimensions;

            return (
              <List.Item
                key={`screen-${index}`}
                title={`Screen ${screenIndex}: ${width}x${height}`}
                subtitle={`Position: ${x}, ${y}`}
              />
            );
          })}
          {screenInfo.activeWindow && (
            <List.Item
              title={`Active Window on Screen ${screenInfo.activeWindow.screenIndex}`}
              subtitle={`Position: ${screenInfo.activeWindow.windowPosition.x}, ${screenInfo.activeWindow.windowPosition.y}`}
            />
          )}
        </>
      )}
    </List>
  );
}
