import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useEffect, useState } from "react";

const base = "https://commander.liquiditylabsstudio.com";
const endpoint = base + "/mcp";

export default function Connect() {
  const [status, setStatus] = useState(
    "Checking the public health endpoint...",
  );
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    setLoading(true);
    setStatus("Checking the public health endpoint...");
    fetch(base + "/healthz", { signal: controller.signal, redirect: "error" })
      .then((response) => {
        setStatus(
          response.ok
            ? "Service reachable"
            : "Service returned HTTP " + response.status,
        );
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setStatus("Service could not be reached");
        else setStatus("Health check timed out");
      })
      .finally(() => {
        clearTimeout(timer);
        setLoading(false);
      });
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [attempt]);

  const markdown = [
    "# BlackVault Commander",
    "**" +
      status +
      "** — public service health only; this does not verify a paired device or OAuth session.",
    "Connect Raycast AI to computers you own or have permission to administer.",
    "## Connect using Raycast's native MCP client",
    "1. Copy the server URL using the action below.",
    "2. Search for **Install MCP Server** in Raycast.",
    "3. Set the name to **BlackVault Commander**, select HTTP transport and paste the URL.",
    "4. Select Dynamic OAuth and install. Sign in and review the requested permissions.",
    "5. Open **Manage MCP Servers** to verify the server is running. Use @blackvault-commander in Raycast AI.",
    "Raycast Pro and a BlackVault account with an authorized, paired Windows computer are required for MCP tool use. The Commander service has a separate free plan and optional paid plan.",
    "On iPhone and iPad, add the same server URL in Raycast’s native MCP settings and complete OAuth. This desktop Store companion is not required on iOS.",
    "Only connect devices you have permission to administer. This extension never collects passwords or access tokens.",
  ].join("\n\n");

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy MCP Server URL"
            content={endpoint}
          />
          <Action
            title="Refresh Service Status"
            icon={Icon.ArrowClockwise}
            onAction={() => setAttempt((value) => value + 1)}
          />
          <Action.OpenInBrowser title="Open Commander Website" url={base} />
          <Action.OpenInBrowser
            title="Open Setup Guide"
            url={base + "/docs/mcp"}
          />
          <Action.OpenInBrowser
            title="Contact Support"
            url={base + "/support"}
          />
          <Action.OpenInBrowser
            title="View Privacy Notice"
            url={base + "/privacy"}
          />
        </ActionPanel>
      }
    />
  );
}
