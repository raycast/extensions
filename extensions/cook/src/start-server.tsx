/**
 * START SERVER — Launch the CookCLI web UI in your browser.
 * Shows a page with a clickable link when already running or just started.
 */

import { Detail, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import { getPreferences, resolveCookPath } from "./utils";
import { spawn } from "child_process";

type ServerState = "loading" | "already-running" | "started" | "error";

export default function Command() {
  const [state, setState] = useState<ServerState>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const { recipePath, serverPort } = getPreferences();
    const cookPath = resolveCookPath();
    const url = `http://localhost:${serverPort}`;

    fetch(url)
      .then(() => setState("already-running"))
      .catch(() => {
        try {
          let spawnFailed = false;
          const child = spawn(
            cookPath,
            ["server", recipePath, "-p", serverPort],
            {
              detached: true,
              stdio: "ignore",
            },
          );

          child.on("error", (err) => {
            spawnFailed = true;
            setState("error");
            setErrorMsg(err.message);
          });

          child.unref();

          // Bounded readiness probe: retry until the server responds or the
          // deadline passes, so slower CookCLI startups aren't falsely reported
          // as failed (see Greptile review on PR #30223).
          const PROBE_INTERVAL_MS = 500;
          const PROBE_TIMEOUT_MS = 15000;
          const startedAt = Date.now();

          const probe = async () => {
            if (spawnFailed) return;
            try {
              await fetch(url);
              setState("started");
            } catch {
              if (Date.now() - startedAt >= PROBE_TIMEOUT_MS) {
                setState("error");
                setErrorMsg(
                  "Server process started but not responding. Check your preferences.",
                );
              } else {
                setTimeout(probe, PROBE_INTERVAL_MS);
              }
            }
          };

          setTimeout(probe, PROBE_INTERVAL_MS);
        } catch (err) {
          setState("error");
          setErrorMsg(err instanceof Error ? err.message : String(err));
        }
      });
  }, []);

  const { serverPort, recipePath } = getPreferences();
  const url = `http://localhost:${serverPort}`;

  if (state === "loading")
    return <Detail isLoading markdown="*Checking server…*" />;

  if (state === "already-running") {
    return (
      <Detail
        markdown={`# 🍳 Server Already Running\n\nServing recipes on port **${serverPort}**.\n\n[**Click to open →**](${url})`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open in Browser" url={url} />
          </ActionPanel>
        }
      />
    );
  }

  if (state === "started") {
    return (
      <Detail
        markdown={`# 🍳 Server Started\n\nServing from \`${recipePath}\` on port **${serverPort}**.\n\n[**Click to open →**](${url})`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open in Browser" url={url} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      markdown={`# Failed to Start\n\n${errorMsg}\n\nCheck that CookCLI is installed and preferences are correct.\n\n**Binary:** \`${resolveCookPath()}\`\n**Recipes:** \`${recipePath}\``}
    />
  );
}
