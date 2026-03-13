import { run, runSync, shellQuote, which } from "./exec";

export const SESSION_PREFIX = "tailserve";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getSessionName(port: number): string {
  return `${SESSION_PREFIX}-${port}`;
}

export function isOpenCodeInstalled(): boolean {
  return which("opencode");
}

export function isTmuxInstalled(): boolean {
  return which("tmux");
}

export async function isHealthy(port: number): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1000);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/global/health`, {
      method: "GET",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/** Returns true only when both our tmux session exists AND the server is healthy. */
export async function isManagedAndHealthy(port: number): Promise<boolean> {
  return isSessionRunning(port) && (await isHealthy(port));
}

export function isSessionRunning(port: number): boolean {
  const session = getSessionName(port);
  try {
    runSync(`tmux has-session -t ${shellQuote(session)}`);
    return true;
  } catch {
    return false;
  }
}

export async function start(port: number, password?: string): Promise<boolean> {
  const session = getSessionName(port);

  try {
    try {
      await run(`tmux kill-session -t ${shellQuote(session)}`);
    } catch {
      // Session did not exist.
    }

    await run(`tmux new-session -d -s ${shellQuote(session)}`);

    if (password && password.length > 0) {
      const exportPasswordCommand = `export OPENCODE_SERVER_PASSWORD=${shellQuote(password)}`;
      await run(
        `tmux send-keys -t ${shellQuote(session)} ${shellQuote(exportPasswordCommand)} Enter`,
      );
    }

    const serveCommand = `exec opencode serve --hostname 127.0.0.1 --port ${port}`;
    await run(
      `tmux send-keys -t ${shellQuote(session)} ${shellQuote(serveCommand)} Enter`,
    );

    for (let i = 0; i < 20; i += 1) {
      if (await isHealthy(port)) {
        return true;
      }
      await sleep(500);
    }

    await stop(port);
    return false;
  } catch {
    await stop(port);
    return false;
  }
}

export async function stop(port: number): Promise<void> {
  const session = getSessionName(port);

  try {
    await run(`tmux kill-session -t ${shellQuote(session)}`);
  } catch {
    // Session may already be stopped.
  }
}
