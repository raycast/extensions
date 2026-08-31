import { Action, ActionPanel, Detail, environment, Icon, launchCommand, LaunchType, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { useCallback, useEffect, useRef, useState } from "react";
import { HEARTBEAT_FILE, highlightDisplay, killStrayOverlays, stopHighlight } from "./lib/highlight";
import { enumerateScreens, Screen } from "./lib/screens";
import { screenshotFlowErrorMessage } from "./lib/screenshot-flow";

function ignoreFileSystemError(action: () => void): void {
  try {
    action();
  } catch {
    return;
  }
}

export default function Command() {
  const [screens, setScreens] = useState<Screen[]>();
  const [loadError, setLoadError] = useState<string>();
  const lastHighlightedDisplay = useRef<number | undefined>(undefined);
  const heartbeatInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatInterval.current !== undefined) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = undefined;
    }

    ignoreFileSystemError(() => unlinkSync(HEARTBEAT_FILE));
  }, []);

  const runCapture = useCallback(
    async (screen: Screen) => {
      try {
        stopHighlight();
        stopHeartbeat();
        await launchCommand({
          name: "capture-and-paste",
          type: LaunchType.UserInitiated,
          context: { displayNumber: screen.displayNumber },
        });
      } catch (error) {
        highlightDisplay(screen.displayNumber);
        await showFailureToast(error, { title: "Failed to Start Capture" });
      }
    },
    [stopHeartbeat],
  );

  useEffect(() => {
    const writeHeartbeat = () => {
      ignoreFileSystemError(() => writeFileSync(HEARTBEAT_FILE, String(Date.now())));
    };

    ignoreFileSystemError(() => mkdirSync(environment.supportPath, { recursive: true }));

    writeHeartbeat();
    heartbeatInterval.current = setInterval(writeHeartbeat, 200);

    return stopHeartbeat;
  }, [stopHeartbeat]);

  useEffect(() => {
    let active = true;

    killStrayOverlays()
      .then(() => enumerateScreens())
      .then((items) => {
        if (!active) {
          return;
        }

        if (items.length === 1) {
          void runCapture(items[0]);
        } else {
          setScreens(items);
        }
      })
      .catch((error) => {
        if (active) {
          const message = screenshotFlowErrorMessage(error);
          setLoadError(message);
          void showFailureToast(new Error(message), { title: "Failed to Find Displays" });
        }
      });

    return () => {
      active = false;
    };
  }, [runCapture]);

  useEffect(() => {
    const displayNumber = screens?.[0]?.displayNumber;

    if (displayNumber !== undefined && lastHighlightedDisplay.current === undefined) {
      lastHighlightedDisplay.current = displayNumber;
      highlightDisplay(displayNumber);
    }
  }, [screens]);

  useEffect(() => {
    return () => {
      stopHighlight();
    };
  }, []);

  if (!screens) {
    return <Detail isLoading={!loadError} markdown={loadError} />;
  }

  return (
    <List
      onSelectionChange={(id) => {
        if (id === null) {
          lastHighlightedDisplay.current = undefined;
          stopHighlight();
          return;
        }

        const displayNumber = Number(id);
        if (lastHighlightedDisplay.current !== displayNumber) {
          lastHighlightedDisplay.current = displayNumber;
          highlightDisplay(displayNumber);
        }
      }}
    >
      {screens.map((screen) => (
        <List.Item
          id={String(screen.displayNumber)}
          key={screen.displayNumber}
          title={screen.displayNumber + " · " + (screen.name || "Display " + screen.displayNumber)}
          subtitle={`${screen.width}x${screen.height}`}
          icon={Icon.Desktop}
          actions={
            <ActionPanel>
              <Action title="Capture & Paste" icon={Icon.Camera} onAction={() => runCapture(screen)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
