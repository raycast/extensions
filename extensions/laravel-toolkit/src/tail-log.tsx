import { Detail, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { spawn } from "child_process";
import { join } from "path";
import { existsSync } from "fs";
import { findLaravelProjectRoot } from "../lib/projectLocator";

export default function TailLaravelLog() {
  const [lines, setLines] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let tailProcess: ReturnType<typeof spawn> | null = null;

    async function startTailing() {
      const projectRoot = await findLaravelProjectRoot();
      if (!projectRoot) {
        setError("No active Laravel project found. Please add a project first.");
        return;
      }

      const logPath = join(projectRoot, "storage", "logs", "laravel.log");
      if (!existsSync(logPath)) {
        setError(`Log file not found at ${logPath}`);
        return;
      }

      await showToast({ style: Toast.Style.Animated, title: "Tailing Laravel Log…" });
      tailProcess = spawn("tail", ["-n", "50", "-F", logPath]);
      tailProcess.stdout?.setEncoding("utf8");
      tailProcess.stdout?.on("data", (data: Buffer) => {
        const newLines = data
          .toString()
          .split("\n")
          .filter((l) => l.length > 0);
        setLines((prev) => {
          const combined = [...prev, ...newLines];
          return combined.slice(-200);
        });
      });
      tailProcess.on("error", (err) => {
        setError(err.message);
      });
      setIsReady(true);
    }

    startTailing();

    return () => {
      if (tailProcess) {
        tailProcess.kill();
      }
    };
  }, []);

  if (error) {
    return <Detail markdown={`**Error:** ${error}`} />;
  }

  return <Detail isLoading={!isReady} markdown={`\`\`\`\n${lines.join("\n")}\n\`\`\``} />;
}
