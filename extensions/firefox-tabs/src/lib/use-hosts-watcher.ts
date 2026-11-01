import { watch } from "fs";
import { useEffect } from "react";
import { CONFIG_DIR } from "./hosts";

/**
 * Call `onChange` when a native host starts or stops. Each host writes
 * hosts/<firefoxPid>.json (and the shared port file) once it is listening and
 * removes them when its Firefox profile disconnects, so a profile starting or
 * quitting is noticed straight away.
 */
export function useHostsWatcher(onChange: () => void) {
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    try {
      const watcher = watch(CONFIG_DIR, { recursive: true }, (_event, filename) => {
        if (filename === "port" || filename?.startsWith("hosts")) {
          // Coalesce the burst of events from one atomic write.
          clearTimeout(timer);
          timer = setTimeout(onChange, 500);
        }
      });
      return () => {
        clearTimeout(timer);
        watcher.close();
      };
    } catch {
      // Directory doesn't exist yet — user needs manual setup
    }
  }, [onChange]);
}
