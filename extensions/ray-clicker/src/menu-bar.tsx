import { MenuBarExtra, Icon, launchCommand, LaunchType, LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { loadGameState, saveGameState } from "./storage";
import type { GameState } from "./types";
import { formatNumber } from "./utils";

export default function MenuBar() {
  const MIN_GAIN_EPS = 0.01; // avoid noisy renders on tiny accruals
  const [state, setState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastUpdateRef = useRef<number>(Date.now());

  // Single-run accrue on invocation; Raycast will re-run based on interval in manifest
  useEffect(() => {
    (async () => {
      try {
        await LocalStorage.setItem("idle-menu-bar-active", "1");
        const loaded = await loadGameState();
        const now = Date.now();
        const prevTs = loaded.lastUpdate || now;
        const dt = Math.max(0, (now - prevTs) / 1000);
        lastUpdateRef.current = now;

        let next: GameState = loaded;
        if (dt > 0) {
          const gained = (loaded.idleRate || 0) * dt;
          if (gained >= MIN_GAIN_EPS) {
            next = {
              ...loaded,
              currency: loaded.currency + gained,
              prestige: {
                ...loaded.prestige,
                totalEarned: loaded.prestige.totalEarned + gained,
                lifetimeEarned: loaded.prestige.lifetimeEarned + gained,
              },
              lastUpdate: now,
            };
            await saveGameState(next);
          } else {
            // Still bump lastUpdate to avoid double counting on frequent runs
            next = { ...loaded, lastUpdate: now } as GameState;
            await saveGameState(next);
          }
        } else {
          // Touch timestamp to ensure freshness
          next = { ...loaded, lastUpdate: now } as GameState;
          await saveGameState(next);
        }

        setState(next);
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      void LocalStorage.removeItem("idle-menu-bar-active");
    };
  }, []);

  const currency = state ? formatNumber(state.currency) : "…";
  const pps = state ? formatNumber(state.idleRate) : "…";

  return (
    <MenuBarExtra isLoading={isLoading} icon={Icon.Coins} title={`${currency} pts`} tooltip={`Idle: ${pps}/sec`}>
      <MenuBarExtra.Item
        title="Open Ray Clicker"
        icon={Icon.AppWindow}
        onAction={async () => {
          try {
            await launchCommand({ name: "index", type: LaunchType.UserInitiated });
          } catch (e) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to open Ray Clicker",
              message: e instanceof Error ? e.message : String(e),
            });
          }
        }}
      />
      <MenuBarExtra.Item title={`Points per Second: ${pps}`} icon={Icon.Gauge} />
      <MenuBarExtra.Item
        title="Reset Heartbeat"
        icon={Icon.RotateAntiClockwise}
        onAction={async () => {
          await LocalStorage.setItem("idle-menu-bar-active", "1");
        }}
      />
    </MenuBarExtra>
  );
}
