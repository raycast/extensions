import { Detail, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import React, { useEffect, useState } from "react";

interface ExecError extends Error {
  stdout?: Buffer | string;
  stderr?: Buffer | string;
  status?: number;
}

export default function Command() {
  const [status, setStatus] = useState<string>("Loading...");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getStatus() {
      try {
        console.log("Getting Rex status...");
        console.log("Executing Rex AppleScript: status");

        const result = await runAppleScript<string>(`tell application id "com.sorrenogroup.rex" to «event RexxStat»`, {
          timeout: 30000,
        });

        console.log("Status result:", result);

        const trimmed = result.trim();
        let displayStatus = trimmed;
        try {
          const parsed = JSON.parse(trimmed);
          if (typeof parsed?.armed === "boolean") {
            displayStatus = parsed.armed ? "Armed" : "Disarmed";
          }
        } catch {
          // Non-JSON response; display raw output.
        }

        setStatus(displayStatus);
        setIsLoading(false);
      } catch (error) {
        console.error("Error getting Rex status:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const execError = error as ExecError;

        console.error("Error details:", {
          message: errorMessage,
          stdout: execError.stdout?.toString(),
          stderr: execError.stderr?.toString(),
          status: execError.status,
        });

        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to get Rex status",
          message: errorMessage,
        });
        setStatus(`Error: ${errorMessage}`);
        setIsLoading(false);
      }
    }

    getStatus();
  }, []);

  return <Detail isLoading={isLoading} markdown={`# Rex Status\n\n${status}`} />;
}
