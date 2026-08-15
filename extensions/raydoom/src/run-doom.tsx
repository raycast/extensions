import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Clipboard,
  Alert,
  confirmAlert,
  closeMainWindow,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState, useCallback, useRef, memo } from "react";
import { getDoomEngine, cleanupDoomEngine } from "./doom-engine";
import { InputAction, getDoomKey, getActionDelay } from "./input-mapper";
import { GameConfig } from "./menu-config";
import { startMemoryMonitoring, stopMemoryMonitoring, formatMemoryStats, getMemoryStats } from "./memory-manager";
import type { MemoryStats } from "./memory-manager";
import { isWadDownloaded, deleteWadFile, getWadFileSize, getWadPath } from "./utils/wad-manager";
import { areEngineFilesDownloaded } from "./utils/engine-manager";
import DownloadPrompt from "./components/download-prompt";
import EngineDownloadPrompt from "./components/engine-download-prompt";
import { DEFAULT_CONFIG } from "./menu-config";

interface RunDoomProps {
  config?: GameConfig;
}

// Display throttle: Update UI at ~15 FPS while game runs at 35 FPS
const DISPLAY_FPS = 15;
const DISPLAY_INTERVAL_MS = 1000 / DISPLAY_FPS;

// Heartbeat interval - component sends heartbeat while active
const HEARTBEAT_INTERVAL_MS = 1000;
const HEARTBEAT_TIMEOUT_MS = 3000;

function Command({ config = DEFAULT_CONFIG }: RunDoomProps = {}) {
  const [asciiFrame, setAsciiFrame] = useState<string>("Loading DOOM...");
  const [isInitialized, setIsInitialized] = useState(false);
  const [engineReady, setEngineReady] = useState(areEngineFilesDownloaded());
  const [wadReady, setWadReady] = useState(isWadDownloaded());
  const [heartbeat, setHeartbeat] = useState<number>(0); // Forces re-render to prove component is alive
  const [navTitle, setNavTitle] = useState<string>("DOOM");

  // heartbeat is used to force re-renders to detect view being hidden
  void heartbeat;

  const rawFrameRef = useRef<string>("");
  const lastDisplayUpdateRef = useRef<number>(0);
  const cleanupCalledRef = useRef<boolean>(false);
  const lastHeartbeatRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchdogIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const gameActuallyStartedRef = useRef<boolean>(false); // Track if game loop actually started
  const prevStatsRef = useRef<{
    kills: number;
    secrets: number;
    keys: {
      blueCard: boolean;
      yellowCard: boolean;
      redCard: boolean;
      blueSkull: boolean;
      yellowSkull: boolean;
      redSkull: boolean;
    };
  }>({
    kills: 0,
    secrets: 0,
    keys: {
      blueCard: false,
      yellowCard: false,
      redCard: false,
      blueSkull: false,
      yellowSkull: false,
      redSkull: false,
    },
  });
  const lowHealthToastShownRef = useRef<boolean>(false);

  // Cleanup function that can be called from multiple places
  const performCleanup = useCallback(() => {
    if (cleanupCalledRef.current) return; // Prevent double cleanup
    cleanupCalledRef.current = true;

    console.log("[Doom] Performing cleanup...");
    cleanupDoomEngine(true); // Force cleanup even if initializing
    stopMemoryMonitoring();

    // Clear intervals
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (watchdogIntervalRef.current) {
      clearInterval(watchdogIntervalRef.current);
      watchdogIntervalRef.current = null;
    }
  }, []);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      console.log("[Doom] Component unmounting...");
      performCleanup();
    };
  }, [performCleanup]);

  // Heartbeat system - proves component is still active
  useEffect(() => {
    if (!isInitialized) return;

    // Send heartbeat every second (this only works if React is processing updates)
    heartbeatIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        lastHeartbeatRef.current = Date.now();
        setHeartbeat((h) => h + 1); // Trigger re-render to prove we're alive
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Watchdog: check if heartbeats are being processed
    // This runs in a separate context and detects if React stopped processing
    watchdogIntervalRef.current = setInterval(() => {
      const timeSinceHeartbeat = Date.now() - lastHeartbeatRef.current;
      if (timeSinceHeartbeat > HEARTBEAT_TIMEOUT_MS && !cleanupCalledRef.current) {
        console.log(`[Doom] Heartbeat timeout (${timeSinceHeartbeat}ms), view likely hidden, cleaning up...`);
        performCleanup();
      }
    }, 1000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (watchdogIntervalRef.current) {
        clearInterval(watchdogIntervalRef.current);
        watchdogIntervalRef.current = null;
      }
    };
  }, [isInitialized, performCleanup]);

  useEffect(() => {
    if (!isInitialized) return;

    // Mark that game actually started (for cleanup logic)
    gameActuallyStartedRef.current = true;
    console.log("[Doom] Game state update loop starting, gameActuallyStartedRef=true");

    const interval = setInterval(async () => {
      const engine = getDoomEngine();
      const stats = engine.getPlayerStatus();

      if (stats) {
        // Format navigation title: H:100% A:0% B:50 K:01
        const health = Math.max(0, stats.health); // Clamp to 0 minimum (can go negative on death)
        const armor = Math.max(0, stats.armor);
        const ammo = stats.weaponAmmo === -1 ? "∞" : String(stats.weaponAmmo).padStart(2, "0");
        const kills = String(stats.stats.kills).padStart(2, "0");
        setNavTitle(`H:${health}% A:${armor}% B:${ammo} K:${kills}`);

        // Detect key pickups and show toasts
        const keyEvents: Array<{ key: keyof typeof stats.keys; name: string }> = [
          { key: "blueCard", name: "[BLUE] Keycard" },
          { key: "yellowCard", name: "[YELLOW] Keycard" },
          { key: "redCard", name: "[RED] Keycard" },
          { key: "blueSkull", name: "[BLUE] Skull Key" },
          { key: "yellowSkull", name: "[YELLOW] Skull Key" },
          { key: "redSkull", name: "[RED] Skull Key" },
        ];

        for (const { key, name } of keyEvents) {
          if (stats.keys[key] && !prevStatsRef.current.keys[key]) {
            const toast = await showToast({
              style: Toast.Style.Animated,
              title: name,
            });
            setTimeout(() => {
              toast.style = Toast.Style.Success;
            }, 800);
          }
        }

        // Detect secrets found
        if (stats.stats.secrets > prevStatsRef.current.secrets) {
          const toast = await showToast({
            style: Toast.Style.Animated,
            title: "SECRET FOUND!",
            message: `${stats.stats.secrets} discovered`,
          });
          setTimeout(() => {
            toast.style = Toast.Style.Success;
          }, 800);
        }

        // Low health warning (only once per danger zone)
        if (stats.health <= 25 && stats.health > 0 && !lowHealthToastShownRef.current) {
          showToast({
            style: Toast.Style.Failure,
            title: "LOW HEALTH!",
            message: `${stats.health}% remaining`,
          });
          lowHealthToastShownRef.current = true;
        } else if (stats.health > 25) {
          lowHealthToastShownRef.current = false;
        }

        // Update previous stats for next comparison
        prevStatsRef.current = {
          kills: stats.stats.kills,
          secrets: stats.stats.secrets,
          keys: { ...stats.keys },
        };
      }
    }, 500);

    return () => {
      console.log("[Doom] Game state update loop stopping");
      clearInterval(interval);
    };
  }, [isInitialized]);

  useEffect(() => {
    startMemoryMonitoring((stats: MemoryStats) => {
      showToast({
        style: Toast.Style.Failure,
        title: "High Memory Usage",
        message: formatMemoryStats(stats),
      });
    });

    // Memory monitoring cleanup is handled by performCleanup
    return () => {};
  }, []);

  useEffect(() => {
    // Only initialize engine if WAD file is ready
    if (!wadReady) return;

    // Generate unique session ID for this effect instance
    // This prevents stale promises from starting the game after unmount
    const sessionId = Date.now() + Math.random();
    let isSessionActive = true;

    // Log session start for debugging
    console.log(`[Doom] Starting new game session (id=${sessionId.toFixed(0)})`);

    // Reset refs for fresh session
    rawFrameRef.current = "";
    lastDisplayUpdateRef.current = 0;
    cleanupCalledRef.current = false;
    gameActuallyStartedRef.current = false;

    const engine = getDoomEngine();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleFrameUpdate = (frame: string, _width: number, _height: number) => {
      // Ignore frames if this session was cancelled
      if (!isSessionActive) return;

      rawFrameRef.current = frame;

      // Throttle display updates to ~15 FPS (game still runs at 35 FPS)
      const now = Date.now();
      if (now - lastDisplayUpdateRef.current < DISPLAY_INTERVAL_MS) {
        return; // Skip this frame to reduce memory/render pressure
      }
      lastDisplayUpdateRef.current = now;

      // Format with proper line breaks for ASCII display (106x20 frame)
      const lines = [];
      const charsPerLine = 106;
      for (let i = 0; i < frame.length; i += charsPerLine) {
        lines.push(frame.substring(i, i + charsPerLine));
      }
      setAsciiFrame(lines.join("\n"));
    };

    const handleLog = (message: string) => {
      if (message.includes("Queued key:")) {
        return;
      }
      console.log(`[Doom] ${message}`);
    };

    // Initialize the engine
    engine
      .initialize(handleFrameUpdate, handleLog, config)
      .then(() => {
        // Check if THIS session is still active (not a stale promise from previous mount)
        if (!isSessionActive) {
          console.log("[Doom] Stale session, skipping game start");
          return;
        }

        setIsInitialized(true);
        showToast({
          style: Toast.Style.Success,
          title: "DOOM Loaded",
          message: "Use keyboard shortcuts to play!",
        });

        // Start the game
        engine.startGame();
      })
      .catch((error) => {
        if (!isSessionActive) return; // Ignore errors from stale sessions
        const errorMessage = error instanceof Error ? error.message : String(error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Load DOOM",
          message: errorMessage,
        });
        setAsciiFrame(`# Error\n\nFailed to load DOOM:\n\n${errorMessage}`);
      });

    // Cleanup on unmount (React lifecycle)
    return () => {
      console.log("[Doom] React unmount cleanup triggered");
      isSessionActive = false; // Mark this session as cancelled
      performCleanup();
    };
  }, [config, wadReady, performCleanup]);

  // Handle input action
  const handleAction = useCallback(
    (action: InputAction) => {
      if (!isInitialized) {
        showToast({
          style: Toast.Style.Failure,
          title: "Game Not Ready",
          message: "Wait for DOOM to initialize",
        });
        return;
      }

      const keyCode = getDoomKey(action);
      const engine = getDoomEngine();

      // Get user-configured delays from Raycast preferences
      const prefs = getPreferenceValues<Preferences>();
      const forwardBackwardDelay = parseInt(prefs.forwardBackwardDelay) || 200;
      const turnStrafeDelay = parseInt(prefs.turnStrafeDelay) || 150;
      const delay = getActionDelay(action, forwardBackwardDelay, turnStrafeDelay);

      engine.queueKey(keyCode);

      setTimeout(() => {
        engine.queueKey(-keyCode);
      }, delay);
    },
    [isInitialized],
  );

  const copyFrameToClipboard = useCallback(async () => {
    const rawFrame = rawFrameRef.current;
    if (!rawFrame) {
      showToast({
        style: Toast.Style.Failure,
        title: "No Frame Available",
        message: "Wait for the game to render",
      });
      return;
    }

    try {
      await Clipboard.copy(rawFrame);
      showToast({
        style: Toast.Style.Success,
        title: "Frame Copied",
        message: `Copied ${rawFrame.length} characters to clipboard`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Copy Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  /**
   * Stop the game and cleanup WASM engine
   * Required before re-downloading WAD file
   */
  const handleStop = useCallback(async () => {
    if (!isInitialized) return;

    // Use shared cleanup function
    performCleanup();

    // Reset state
    setIsInitialized(false);

    await showToast({
      style: Toast.Style.Success,
      title: "Game Stopped",
      message: "WASM engine cleaned up",
    });

    // Close the window to fully terminate the process
    await closeMainWindow();
  }, [isInitialized, performCleanup]);

  const handleShowMemoryStats = useCallback(async () => {
    const stats = getMemoryStats();
    await showToast({
      style: Toast.Style.Success,
      title: "Memory Stats",
      message: formatMemoryStats(stats),
    });
  }, []);

  // Check engine availability - AFTER all hooks are called
  if (!engineReady) {
    return <EngineDownloadPrompt onComplete={() => setEngineReady(true)} />;
  }

  // Check WAD file availability
  if (!wadReady) {
    return <DownloadPrompt onComplete={() => setWadReady(true)} />;
  }

  return (
    <Detail
      navigationTitle={navTitle}
      markdown={`\`\`\`text\n${asciiFrame}\n\`\`\``}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Menu">
            <Action
              title="Enter / Select"
              icon={Icon.Checkmark}
              shortcut={{ modifiers: [], key: "return" }}
              onAction={() => handleAction(InputAction.ENTER)}
            />
            <Action
              title="Map"
              icon={Icon.Map}
              shortcut={{ modifiers: [], key: "tab" }}
              onAction={() => handleAction(InputAction.MAP)}
            />
            <Action
              title="Menu (ESC)"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={() => handleAction(InputAction.ESCAPE)}
            />
            <Action
              title="Yes"
              icon={Icon.CheckCircle}
              shortcut={{ modifiers: [], key: "y" }}
              onAction={() => handleAction(InputAction.YES)}
            />
            <Action
              title="No"
              icon={Icon.MinusCircle}
              shortcut={{ modifiers: [], key: "n" }}
              onAction={() => handleAction(InputAction.NO)}
            />

            <Action
              title="Stop Game"
              icon={Icon.XMarkCircle}
              onAction={handleStop}
              shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Movement">
            <Action
              title="Move Forward"
              icon={Icon.ArrowUp}
              shortcut={{ modifiers: [], key: "w" }}
              onAction={() => handleAction(InputAction.MOVE_FORWARD)}
            />
            <Action
              title="Move Backward"
              icon={Icon.ArrowDown}
              shortcut={{ modifiers: [], key: "s" }}
              onAction={() => handleAction(InputAction.MOVE_BACKWARD)}
            />
            <Action
              title="Turn Left"
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: [], key: "a" }}
              onAction={() => handleAction(InputAction.TURN_LEFT)}
            />
            <Action
              title="Turn Right"
              icon={Icon.ArrowRight}
              shortcut={{ modifiers: [], key: "d" }}
              onAction={() => handleAction(InputAction.TURN_RIGHT)}
            />
            <Action
              title="Strafe Left"
              icon={Icon.ChevronLeft}
              shortcut={{ modifiers: [], key: "q" }}
              onAction={() => handleAction(InputAction.STRAFE_LEFT)}
            />
            <Action
              title="Strafe Right"
              icon={Icon.ChevronRight}
              shortcut={{ modifiers: [], key: "e" }}
              onAction={() => handleAction(InputAction.STRAFE_RIGHT)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Actions">
            <Action
              title="Fire"
              icon={Icon.Rocket}
              shortcut={{ modifiers: [], key: "f" }}
              onAction={() => handleAction(InputAction.FIRE)}
            />
            <Action
              title="Use / Open"
              icon={Icon.CircleProgress}
              shortcut={{ modifiers: [], key: "r" }}
              onAction={() => handleAction(InputAction.USE)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Weapons">
            <Action
              title="Weapon 1"
              icon={Icon.Hammer}
              shortcut={{ modifiers: [], key: "1" }}
              onAction={() => handleAction(InputAction.WEAPON_1)}
            />
            <Action
              title="Weapon 2"
              icon={Icon.BullsEye}
              shortcut={{ modifiers: [], key: "2" }}
              onAction={() => handleAction(InputAction.WEAPON_2)}
            />
            <Action
              title="Weapon 3"
              icon={Icon.ExclamationMark}
              shortcut={{ modifiers: [], key: "3" }}
              onAction={() => handleAction(InputAction.WEAPON_3)}
            />
            <Action
              title="Weapon 4"
              icon={Icon.Bolt}
              shortcut={{ modifiers: [], key: "4" }}
              onAction={() => handleAction(InputAction.WEAPON_4)}
            />
            <Action
              title="Weapon 5"
              icon={Icon.Exclamationmark2}
              shortcut={{ modifiers: [], key: "5" }}
              onAction={() => handleAction(InputAction.WEAPON_5)}
            />
            <Action
              title="Weapon 6"
              icon={Icon.Gauge}
              shortcut={{ modifiers: [], key: "6" }}
              onAction={() => handleAction(InputAction.WEAPON_6)}
            />
            <Action
              title="Weapon 7"
              icon={Icon.Crown}
              shortcut={{ modifiers: [], key: "7" }}
              onAction={() => handleAction(InputAction.WEAPON_7)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="WAD Management">
            <Action
              title="Redownload WAD File"
              icon={Icon.ArrowClockwise}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: "Re-download WAD File?",
                  message: `This will delete the current WAD file (${getWadFileSize() || "unknown size"}) and require re-download on next launch.`,
                  primaryAction: {
                    title: "Re-download",
                    style: Alert.ActionStyle.Destructive,
                  },
                });

                if (confirmed) {
                  // Stop intervals FIRST to prevent rendering loop
                  if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current);
                    heartbeatIntervalRef.current = null;
                  }
                  if (watchdogIntervalRef.current) {
                    clearInterval(watchdogIntervalRef.current);
                    watchdogIntervalRef.current = null;
                  }

                  // Force cleanup engine and clear cache so new WAD loads fresh
                  cleanupDoomEngine(true);
                  stopMemoryMonitoring();

                  // Delete WAD file
                  const deleted = deleteWadFile();
                  if (deleted) {
                    await showToast({
                      style: Toast.Style.Success,
                      title: "WAD Deleted",
                      message: "Reopen extension to re-download",
                    });

                    // Close window and return to Raycast home
                    // Next launch will detect missing WAD and show DownloadPrompt
                    await closeMainWindow();
                  } else {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to Delete WAD",
                      message: "Manual deletion required",
                    });
                  }
                }
              }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />

            <Action
              title="Show WAD File Info"
              icon={Icon.Info}
              onAction={async () => {
                await showToast({
                  style: Toast.Style.Success,
                  title: "WAD File Info",
                  message: `Location: ${getWadPath()}\nSize: ${getWadFileSize() || "N/A"}`,
                });
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Diagnostics">
            <Action
              title="Copy Frame to Clipboard"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={copyFrameToClipboard}
            />
            <Action
              title="Show Memory Stats"
              icon={Icon.MemoryChip}
              onAction={handleShowMemoryStats}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default memo(Command);
