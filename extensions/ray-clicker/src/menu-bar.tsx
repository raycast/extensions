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
  const uiStateRef = useRef<GameState | null>(null);

  // Continuous accrue on 1s cadence while menu bar is active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    (async () => {
      try {
        await LocalStorage.setItem("idle-menu-bar-active", "1");
        const loaded = await loadGameState();
        const now = Date.now();
        lastUpdateRef.current = loaded.lastUpdate || now;
        setState(loaded);
        uiStateRef.current = loaded;
      } finally {
        setIsLoading(false);
      }

      interval = setInterval(async () => {
        try {
          await LocalStorage.setItem("idle-menu-bar-active", "1");
          const current = await loadGameState();
          const now = Date.now();
          const prevTs = lastUpdateRef.current || current.lastUpdate || now;
          const dt = Math.max(0, (now - prevTs) / 1000);
          lastUpdateRef.current = now;

          let next: GameState = current;
          if (dt > 0) {
            const gained = (current.idleRate || 0) * dt;
            if (gained >= MIN_GAIN_EPS) {
              next = {
                ...current,
                currency: current.currency + gained,
                prestige: {
                  ...current.prestige,
                  totalEarned: current.prestige.totalEarned + gained,
                  lifetimeEarned: current.prestige.lifetimeEarned + gained,
                },
                lastUpdate: now,
              };
              await saveGameState(next);
              setState(next);
              uiStateRef.current = next;
            } else {
              // Touch timestamp only; update UI only if visible values differ from what's shown
              const touched = { ...current, lastUpdate: now } as GameState;
              await saveGameState(touched);
              const prevUI = uiStateRef.current;
              const currencyChanged = !prevUI || Math.abs(current.currency - prevUI.currency) >= MIN_GAIN_EPS;
              const ppsChanged = !prevUI || prevUI.idleRate !== current.idleRate;
              if (currencyChanged || ppsChanged) {
                setState(current);
                uiStateRef.current = current;
              }
            }
          } else {
            // No time passed; avoid UI updates unless rate or displayed currency changed externally
            const touched = { ...current, lastUpdate: now } as GameState;
            await saveGameState(touched);
            const prevUI = uiStateRef.current;
            const currencyChanged = !prevUI || Math.abs(current.currency - prevUI.currency) >= MIN_GAIN_EPS;
            const ppsChanged = !prevUI || prevUI.idleRate !== current.idleRate;
            if (currencyChanged || ppsChanged) {
              setState(current);
              uiStateRef.current = current;
            }
          }
        } catch {
          // keep loop alive
        }
      }, 1000);
    })();

    return () => {
      if (interval) clearInterval(interval);
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
