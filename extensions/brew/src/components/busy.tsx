import { Action, Image } from "@raycast/api";
import { useEffect, useState } from "react";
import { brewIdentifier, isCask, type Cask, type Nameable } from "../utils";
import { inFlightKey, useInFlight } from "../utils/inFlight";
import { progressIcon } from "./palette";

/** Drawn once: a busy row only steps through them. */
const FRAMES = Array.from({ length: 8 }, (_, i) => progressIcon((i + 1) / 8));

/** The in-flight key for a package, shared by Install, Upgrade and Uninstall. */
export function packageKey(item: Cask | Nameable): string {
  return inFlightKey(isCask(item), brewIdentifier(item));
}

/** What is running on `item` right now ("Installing given…"), or `undefined`. */
export function usePackageBusy(item: Cask | Nameable): string | undefined {
  return useInFlight(packageKey(item));
}

/**
 * A progress ring that fills and restarts while `active`, so a busy row
 * visibly moves. Raycast has no animated icon, so this redraws on a timer,
 * and only while something is running.
 */
export function useBusyIcon(active: boolean): Image.ImageLike | undefined {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 150);
    return () => clearInterval(timer);
  }, [active]);
  return active ? FRAMES[frame] : undefined;
}

/** `useBusyIcon` for a package row: the ring while anything runs on it. */
export function usePackageBusyIcon(item: Cask | Nameable): Image.ImageLike | undefined {
  return useBusyIcon(usePackageBusy(item) !== undefined);
}

/**
 * Stands in for Install or Upgrade while the package is busy. Raycast has no
 * disabled action, so this one does nothing: ↵ on it cannot start a second
 * `brew` process.
 */
export function BusyAction(props: { label: string }) {
  const icon = useBusyIcon(true);
  return <Action title={props.label} icon={icon} onAction={() => undefined} />;
}
