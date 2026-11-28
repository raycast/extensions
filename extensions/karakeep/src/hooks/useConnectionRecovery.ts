import { getPreferenceValues } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { getPortFromUrl, isLocalHost } from "../utils/connection";
import { DockerContainer, findContainerByPort, findDockerPath, isDockerRunning } from "../utils/docker";
import { ensureReachable } from "../utils/submitGuard";

const log = logger.child("[ConnectionRecovery]");

/**
 * Probes whether a stopped local container is behind a connection failure, and
 * can start it and wait for the API to come back.
 *
 * The probe is intentionally quiet: Docker is optional, so a machine without it
 * simply never gets the extra actions. Nothing here surfaces a Docker problem
 * as a Karakeep problem.
 */
export function useConnectionRecovery(onRecovered: () => void) {
  const { apiUrl } = getPreferenceValues<Preferences>();
  const [container, setContainer] = useState<DockerContainer | undefined>();
  const [dockerRunning, setDockerRunning] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isProbing, setIsProbing] = useState(true);

  // Guards against setting state after the view is gone (the user can navigate
  // away mid-poll, and waitForApi runs for up to a minute).
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function probe() {
      // `docker info` + `docker inspect` take a couple of seconds, during which
      // the view must NOT claim the server is simply unreachable — that's what
      // made the error appear first and the "Start" offer arrive 3s later.
      try {
        if (!apiUrl || !isLocalHost(apiUrl)) return;
        if (!findDockerPath()) return;

        const running = await isDockerRunning();
        if (cancelled || !mounted.current) return;
        setDockerRunning(running);
        if (!running) return;

        const port = getPortFromUrl(apiUrl);
        if (!port) return;

        const found = await findContainerByPort(port);
        if (cancelled || !mounted.current) return;
        if (found) {
          log.info("Found container for local instance", { name: found.name, status: found.status });
          setContainer(found);
        }
      } finally {
        // Must run on every early return above, or the view stays in its
        // probing state forever on a machine with no Docker.
        if (!cancelled && mounted.current) setIsProbing(false);
      }
    }

    probe();
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  // Delegates to ensureReachable rather than re-driving start → wait → toast:
  // that flow (including the Copy Error action and the deliberate non-success
  // toast when the container starts but the API stays silent) already lives
  // there, and two copies would drift.
  const recover = useCallback(async () => {
    setIsRecovering(true);
    try {
      // Guarded like the state update below: ensureReachable polls for up to
      // 60s, and onRecovered is the view's revalidate — calling it after the
      // user has navigated away refetches for a view that no longer exists.
      if ((await ensureReachable()) === "ok" && mounted.current) onRecovered();
    } finally {
      // Every path — leaving this true wedges the view on "Starting…".
      if (mounted.current) setIsRecovering(false);
    }
  }, [onRecovered]);

  return { apiUrl, container, dockerRunning, isProbing, isRecovering, recover };
}
